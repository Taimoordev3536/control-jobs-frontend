// Mock data for jobs, clients, workers, and related entities
export const MOCK_CLIENTS = [
  {
    id: 1,
    name: "Acme Corporation",
    locality: "New York",
    type: "Corporate",
  },
  {
    id: 2,
    name: "Tech Innovations Ltd",
    locality: "San Francisco",
    type: "Technology",
  },
  {
    id: 3,
    name: "Global Services Inc",
    locality: "London",
    type: "Services",
  },
]

export const MOCK_WORKERS = [
  {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1234567891",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike@example.com",
    phone: "+1234567892",
  },
]

export const MOCK_WORK_CENTERS = [
  {
    id: 1,
    name: "Main Office",
    address: "123 Main St, New York, NY",
  },
  {
    id: 2,
    name: "West Branch",
    address: "456 West Ave, San Francisco, CA",
  },
]

export const MOCK_JOBS = [
  {
    id: 1,
    jobName: "Summer Event Staffing",
    startDate: "2025-06-01",
    endDate: "2025-08-31",
    clientId: 1,
    shifts: [
      { day: "Monday", shiftType: "Morning", startTime: "08:00", endTime: "16:00", totalHours: 8 },
      { day: "Tuesday", shiftType: "Morning", startTime: "08:00", endTime: "16:00", totalHours: 8 },
      { day: "Wednesday", shiftType: "Afternoon", startTime: "14:00", endTime: "22:00", totalHours: 8 },
      { day: "Thursday", shiftType: "Morning", startTime: "08:00", endTime: "16:00", totalHours: 8 },
      { day: "Friday", shiftType: "Morning", startTime: "08:00", endTime: "16:00", totalHours: 8 },
    ],
    signingMethods: [
      { id: 1, method: "Digital Signature", status: "Active" },
      { id: 2, method: "Biometric", status: "Inactive" },
    ],
    alerts: [
      { id: 1, type: "Attendance", message: "Alert on worker absence" },
      { id: 2, type: "Safety", message: "Daily safety briefing required" },
    ],
    tasks: [
      { id: 1, title: "Health & Safety Training", description: "Complete mandatory training", completed: true },
      { id: 2, title: "Uniform Distribution", description: "Issue work uniforms", completed: false },
      { id: 3, title: "Equipment Check", description: "Verify all equipment", completed: true },
    ],
    survey: {
      id: 1,
      questions: [
        { id: 1, question: "How satisfied are you with the job?", type: "Rating" },
        { id: 2, question: "Would you like to work again?", type: "YesNo" },
        { id: 3, question: "Any feedback for improvement?", type: "Text" },
      ],
    },
    note: "Major summer event requiring large staff. Flexible scheduling available.",
  },
  {
    id: 2,
    jobName: "Holiday Season Retail Support",
    startDate: "2025-11-15",
    endDate: "2025-12-31",
    clientId: 2,
    shifts: [
      { day: "Monday", shiftType: "Morning", startTime: "09:00", endTime: "17:00", totalHours: 8 },
      { day: "Tuesday", shiftType: "Morning", startTime: "09:00", endTime: "17:00", totalHours: 8 },
      { day: "Wednesday", shiftType: "Evening", startTime: "17:00", endTime: "21:00", totalHours: 4 },
      { day: "Thursday", shiftType: "Morning", startTime: "09:00", endTime: "17:00", totalHours: 8 },
      { day: "Friday", shiftType: "Evening", startTime: "17:00", endTime: "21:00", totalHours: 4 },
      { day: "Saturday", shiftType: "Full", startTime: "09:00", endTime: "21:00", totalHours: 12 },
      { day: "Sunday", shiftType: "Full", startTime: "10:00", endTime: "20:00", totalHours: 10 },
    ],
    signingMethods: [
      { id: 1, method: "Digital Signature", status: "Active" },
    ],
    alerts: [
      { id: 1, type: "Attendance", message: "Alert on worker absence" },
      { id: 2, type: "Performance", message: "Daily performance review" },
    ],
    tasks: [
      { id: 1, title: "Customer Service Training", description: "Holiday customer service protocols", completed: true },
      { id: 2, title: "Till Training", description: "POS system training", completed: true },
    ],
    survey: {
      id: 2,
      questions: [
        { id: 1, question: "Overall experience rating", type: "Rating" },
        { id: 2, question: "Would recommend to others?", type: "YesNo" },
      ],
    },
    note: "Busy retail season with high customer traffic expected.",
  },
  {
    id: 3,
    jobName: "Conference Support Team",
    startDate: "2025-09-10",
    endDate: "2025-09-12",
    clientId: 3,
    shifts: [
      { day: "Monday", shiftType: "Full", startTime: "07:00", endTime: "19:00", totalHours: 12 },
      { day: "Tuesday", shiftType: "Full", startTime: "07:00", endTime: "19:00", totalHours: 12 },
      { day: "Wednesday", shiftType: "Full", startTime: "07:00", endTime: "19:00", totalHours: 12 },
    ],
    signingMethods: [
      { id: 1, method: "Digital Signature", status: "Active" },
      { id: 2, method: "Mobile App", status: "Active" },
      { id: 3, method: "Badge Scan", status: "Active" },
    ],
    alerts: [
      { id: 1, type: "Attendance", message: "Strict attendance policy" },
      { id: 2, type: "Punctuality", message: "Must arrive 30 minutes early" },
      { id: 3, type: "Safety", message: "Crowd management protocols" },
    ],
    tasks: [
      { id: 1, title: "Briefing Sessions", description: "Attend daily briefings", completed: false },
      { id: 2, title: "Crowd Management", description: "Guest flow management", completed: false },
      { id: 3, title: "Emergency Procedures", description: "Emergency response training", completed: true },
    ],
    survey: {
      id: 3,
      questions: [
        { id: 1, question: "Overall satisfaction with event", type: "Rating" },
        { id: 2, question: "Professional development opportunity?", type: "YesNo" },
        { id: 3, question: "What was the most challenging aspect?", type: "Text" },
      ],
    },
    note: "3-day international conference requiring professional staff.",
  },
]
