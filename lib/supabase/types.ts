export type Role = 'utilisateur' | 'lecteur'
export type Side = 'gauche' | 'droit' | 'les_deux'
export type FrequencyType = 'quotidien' | 'intervalle_jours' | 'jours_semaine'

export interface Family {
  id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  family_id: string
  full_name: string | null
  role: Role
  created_at: string
}

export interface Baby {
  id: string
  family_id: string
  first_name: string
  birth_date: string | null
  created_at: string
}

export interface Feeding {
  id: string
  baby_id: string
  side: Side
  fed_at: string
  duration_minutes: number | null
  note: string | null
  created_by: string | null
  created_at: string
}

export interface DiaperChange {
  id: string
  baby_id: string
  pipi: boolean
  caca: boolean
  changed_at: string
  photo_url: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export interface Bottle {
  id: string
  baby_id: string
  quantity_ml: number | null
  given_at: string
  note: string | null
  created_by: string | null
  created_at: string
}

export interface CareType {
  id: string
  family_id: string
  name: string
  icon: string | null
  active: boolean
  created_at: string
}

export interface CareSchedule {
  id: string
  care_type_id: string
  baby_id: string
  frequency_type: FrequencyType
  times_per_day: number
  interval_days: number | null
  days_of_week: number[] | null
  active: boolean
  created_at: string
}

export interface CareLog {
  id: string
  care_schedule_id: string
  baby_id: string
  scheduled_date: string
  done_at: string | null
  fait: boolean
  photo_url: string | null
  note: string | null
  created_by: string | null
  created_at: string
}