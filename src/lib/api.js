import { supabase } from './supabaseClient.js'
import { todayISO } from './format.js'

const unwrap = ({ data, error }) => {
  if (error) throw error
  return data
}

async function fetchAll(table, columns = '*') {
  const rows = []
  let afterId = null
  while (true) {
    let query = supabase.from(table).select(columns).order('id', { ascending: true }).limit(1000)
    if (afterId) query = query.gt('id', afterId)
    const page = unwrap(await query)
    rows.push(...page)
    if (page.length < 1000) return rows
    afterId = page[page.length - 1].id
  }
}

export async function getCurrentRate() {
  return unwrap(await supabase.from('water_rates').select('rate_per_m3,effective_from')
    .lte('effective_from', todayISO()).order('effective_from', { ascending: false }).limit(1).maybeSingle())
}

export async function getAdminData() {
  const [customerRows, profiles, billRows, paymentRows, goalResult] = await Promise.all([
    fetchAll('customers'),
    fetchAll('profiles', 'id,full_name,role'),
    fetchAll('bills'),
    fetchAll('payments'),
    supabase.from('settings').select('value').eq('key', 'monthly_collection_goal').maybeSingle(),
  ])
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const customers = customerRows
    .filter((customer) => profileMap.get(customer.id)?.role === 'customer')
    .map((customer) => ({ ...customer, full_name: profileMap.get(customer.id)?.full_name || 'Unnamed customer' }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]))
  const bills = billRows.map((bill) => ({ ...bill, customer: customerMap.get(bill.customer_id) || null }))
    .sort((a, b) => b.billing_month.localeCompare(a.billing_month) || b.created_at.localeCompare(a.created_at))
  return { customers, bills, profiles, payments: paymentRows.sort((a, b) => b.paid_at.localeCompare(a.paid_at)), goal: Number(unwrap(goalResult)?.value || 0) }
}

export async function getOwnBills() {
  return (await fetchAll('bills')).sort((a, b) => b.billing_month.localeCompare(a.billing_month))
}

export async function getOwnPayments() {
  const [payments, bills] = await Promise.all([
    fetchAll('payments'),
    fetchAll('bills', 'id,bill_no,billing_month'),
  ])
  const billMap = new Map(bills.map((bill) => [bill.id, bill]))
  return payments.map((payment) => ({ ...payment, bill: billMap.get(payment.bill_id) }))
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
}

export async function getPrintableBill(id) {
  const bill = unwrap(await supabase.from('bills').select('*').eq('id', id).single())
  const [customerResult, profileResult, itemsResult] = await Promise.all([
    supabase.from('customers').select('*').eq('id', bill.customer_id).single(),
    supabase.from('profiles').select('full_name').eq('id', bill.customer_id).single(),
    supabase.from('bill_items').select('*').eq('bill_id', id).order('id'),
  ])
  return { ...bill, items: unwrap(itemsResult), customer: { ...unwrap(customerResult), full_name: unwrap(profileResult).full_name } }
}
