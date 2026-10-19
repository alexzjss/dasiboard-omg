const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

export function getCurrentWeekDays() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return weekdayLabels.map((label, index) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    return { label, date: String(date.getDate()).padStart(2, '0') }
  })
}

export function getGreeting(now = new Date()) {
  const h = now.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}
