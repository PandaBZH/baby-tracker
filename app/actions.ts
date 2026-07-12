// app/actions.ts
export async function getScheduledActionsForToday(babyId: string) {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('care_logs')
    .select(`
      *,
      care_schedules (
        care_types (name, icon)
      )
    `)
    .eq('baby_id', babyId)
    .eq('scheduled_date', today)
    .eq('fait', false)
    .order('scheduled_time', { ascending: true })

  if (error) throw error
  return data
}