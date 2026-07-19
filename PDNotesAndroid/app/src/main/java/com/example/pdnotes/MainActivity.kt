@file:OptIn(ExperimentalMaterial3Api::class)

package com.weinman.pdnotes

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.res.Configuration
import androidx.compose.ui.platform.LocalConfiguration
import androidx.core.content.edit
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.weinman.pdnotes.ui.theme.PDNotesTheme
import org.json.JSONArray
import org.json.JSONObject
import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.pm.PackageManager
import android.provider.ContactsContract
import android.util.Log
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.core.content.ContextCompat
import java.text.SimpleDateFormat
import java.util.*

private const val TAG = "PDNotes"

// MARK: - Data models

enum class DayRating { GOOD, NORMAL, BAD }

enum class TrendRange(val label: String, val days: Int) {
    WEEK("1W", 7),
    MONTH("1M", 30),
    THREE_MONTHS("3M", 90),
    SIX_MONTHS("6M", 180)
}

data class MedicationSchedule(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val dose: String = "",
    val timing: String = "",
    val purpose: String = "",
    val startDate: String,       // "yyyy-MM-dd"
    val endDate: String? = null  // null = ongoing / all following days
)

data class DayStatus(
    val takenDay: Boolean = false,
    val takenAfternoon: Boolean = false,
    val takenNight: Boolean = false,
    val rating: DayRating = DayRating.NORMAL,
    val note: String = "",
    val exercise: String = "",
    val isRead: Boolean = false
)

data class DaySymptoms(
    val tremors: String = "",
    val tremorsSeverity: Int = 0,
    val legs: String = "",
    val legsSeverity: Int = 0,
    val plumbing: String = "",
    val plumbingSeverity: Int = 0,
    val neuropathy: String = "",
    val neuropathySeverity: Int = 0,
    val sleep: String = "",
    val sleepSeverity: Int = 0,
    val diet: String = "",
    val dietSeverity: Int = 0,
    val pain: String = "",
    val painSeverity: Int = 0
)

data class Appointment(
    val id: String = UUID.randomUUID().toString(),
    val date: String,        // "yyyy-MM-dd"
    val title: String,
    val time: String = "",   // "HH:mm", optional
    val location: String = "",
    val notes: String = "",
    val contactId: String? = null
)

data class Contact(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val role: String = "",
    val phone: String = "",
    val email: String = "",
    val address: String = "",
    val notes: String = ""
)

// Returns schedules active on a given dateKey ("yyyy-MM-dd")
fun schedulesForDate(schedules: List<MedicationSchedule>, dateKey: String): List<MedicationSchedule> =
    schedules.filter { it.startDate <= dateKey && (it.endDate == null || it.endDate >= dateKey) }

fun appointmentsForDate(appointments: List<Appointment>, dateKey: String): List<Appointment> =
    appointments.filter { it.date == dateKey }.sortedBy { it.time }

// Formats a "HH:mm" (24-hour) time string as 12-hour am/pm, e.g. "14:05" -> "2:05 PM"
fun formatTimeAmPm(hhmm: String): String {
    if (hhmm.isBlank()) return ""
    return try {
        val parts = hhmm.split(":")
        val h = parts[0].toInt(); val m = parts[1].toInt()
        val ampm = if (h < 12) "AM" else "PM"
        val h12 = when { h == 0 -> 12; h > 12 -> h - 12; else -> h }
        "%d:%02d %s".format(h12, m, ampm)
    } catch (_: Exception) { hhmm }
}

// MARK: - Activity

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PDNotesTheme {
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                    PDNotesApp()
                }
            }
        }
    }
}

// MARK: - Root app

@Composable
fun PDNotesApp() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val sharedPrefs = remember {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        @Suppress("DEPRECATION")
        EncryptedSharedPreferences.create(
            context,
            "pd_notes_encrypted",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    var currentScreen by remember { mutableStateOf("tracker") }
    var selectedWeekOffset by remember { mutableIntStateOf(0) }
    var medsForDate by remember { mutableStateOf<String?>(null) }
    var appointmentForDate by remember { mutableStateOf<String?>(null) }

    val medicationSchedules = remember {
        val saved = sharedPrefs.getString("medication_schedules", null)
        val list = mutableListOf<MedicationSchedule>()
        if (saved != null) {
            try {
                val array = JSONArray(saved)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(MedicationSchedule(
                        id = obj.optString("id", UUID.randomUUID().toString()),
                        name = obj.getString("name"),
                        dose = obj.optString("dose", ""),
                        timing = obj.optString("timing", ""),
                        purpose = obj.optString("purpose", ""),
                        startDate = obj.getString("startDate"),
                        endDate = obj.optString("endDate", "").ifBlank { null }
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Failed to load medication schedules", e) }
        }
        mutableStateListOf<MedicationSchedule>().apply { addAll(list) }
    }

    val dayStatuses = remember {
        val savedData = sharedPrefs.getString("day_statuses", null)
        val initialMap = mutableMapOf<String, DayStatus>()
        if (savedData != null) {
            try {
                val json = JSONObject(savedData)
                json.keys().forEach { key ->
                    val obj = json.getJSONObject(key)
                    initialMap[key] = DayStatus(
                        takenDay = obj.optBoolean("takenDay", obj.optBoolean("taken")),
                        takenAfternoon = obj.optBoolean("takenAfternoon"),
                        takenNight = obj.optBoolean("takenNight"),
                        rating = runCatching { DayRating.valueOf(obj.optString("rating", "NORMAL")) }.getOrDefault(DayRating.NORMAL),
                        note = obj.optString("note"),
                        exercise = obj.optString("exercise"),
                        isRead = obj.optBoolean("isRead")
                    )
                }
            } catch (e: Exception) { Log.e(TAG, "Failed to load day statuses", e) }
        }
        mutableStateMapOf<String, DayStatus>().apply { putAll(initialMap) }
    }

    LaunchedEffect(dayStatuses.toMap()) {
        val json = JSONObject()
        dayStatuses.forEach { (date, status) ->
            val obj = JSONObject()
            obj.put("takenDay", status.takenDay)
            obj.put("takenAfternoon", status.takenAfternoon)
            obj.put("takenNight", status.takenNight)
            obj.put("rating", status.rating.name)
            obj.put("note", status.note)
            obj.put("exercise", status.exercise)
            obj.put("isRead", status.isRead)
            json.put(date, obj)
        }
        sharedPrefs.edit { putString("day_statuses", json.toString()) }
    }

    val daySymptoms = remember {
        val savedData = sharedPrefs.getString("day_symptoms", null)
        val initialMap = mutableMapOf<String, DaySymptoms>()
        if (savedData != null) {
            try {
                val json = JSONObject(savedData)
                json.keys().forEach { key ->
                    val obj = json.getJSONObject(key)
                    initialMap[key] = DaySymptoms(
                        tremors = obj.optString("tremors"),
                        tremorsSeverity = obj.optInt("tremorsSeverity"),
                        legs = obj.optString("legs"),
                        legsSeverity = obj.optInt("legsSeverity"),
                        plumbing = obj.optString("plumbing"),
                        plumbingSeverity = obj.optInt("plumbingSeverity"),
                        neuropathy = obj.optString("neuropathy"),
                        neuropathySeverity = obj.optInt("neuropathySeverity"),
                        sleep = obj.optString("sleep"),
                        sleepSeverity = obj.optInt("sleepSeverity"),
                        diet = obj.optString("diet"),
                        dietSeverity = obj.optInt("dietSeverity"),
                        pain = obj.optString("pain"),
                        painSeverity = obj.optInt("painSeverity")
                    )
                }
            } catch (e: Exception) { Log.e(TAG, "Failed to load day symptoms", e) }
        }
        mutableStateMapOf<String, DaySymptoms>().apply { putAll(initialMap) }
    }

    LaunchedEffect(daySymptoms.toMap()) {
        val json = JSONObject()
        daySymptoms.forEach { (date, s) ->
            val obj = JSONObject()
            obj.put("tremors", s.tremors)
            obj.put("tremorsSeverity", s.tremorsSeverity)
            obj.put("legs", s.legs)
            obj.put("legsSeverity", s.legsSeverity)
            obj.put("plumbing", s.plumbing)
            obj.put("plumbingSeverity", s.plumbingSeverity)
            obj.put("neuropathy", s.neuropathy)
            obj.put("neuropathySeverity", s.neuropathySeverity)
            obj.put("sleep", s.sleep)
            obj.put("sleepSeverity", s.sleepSeverity)
            obj.put("diet", s.diet)
            obj.put("dietSeverity", s.dietSeverity)
            obj.put("pain", s.pain)
            obj.put("painSeverity", s.painSeverity)
            json.put(date, obj)
        }
        sharedPrefs.edit { putString("day_symptoms", json.toString()) }
    }

    val appointments = remember {
        val saved = sharedPrefs.getString("appointments", null)
        val list = mutableListOf<Appointment>()
        if (saved != null) {
            try {
                val array = JSONArray(saved)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(Appointment(
                        id = obj.optString("id", UUID.randomUUID().toString()),
                        date = obj.getString("date"),
                        title = obj.getString("title"),
                        time = obj.optString("time", ""),
                        location = obj.optString("location", ""),
                        notes = obj.optString("notes", ""),
                        contactId = obj.optString("contactId", "").ifBlank { null }
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Failed to load appointments", e) }
        }
        mutableStateListOf<Appointment>().apply { addAll(list) }
    }

    LaunchedEffect(appointments.toList()) {
        val array = JSONArray()
        appointments.forEach { appt ->
            val obj = JSONObject()
            obj.put("id", appt.id)
            obj.put("date", appt.date)
            obj.put("title", appt.title)
            obj.put("time", appt.time)
            obj.put("location", appt.location)
            obj.put("notes", appt.notes)
            obj.put("contactId", appt.contactId ?: "")
            array.put(obj)
        }
        sharedPrefs.edit { putString("appointments", array.toString()) }
    }

    val contacts = remember {
        val saved = sharedPrefs.getString("contacts", null)
        val list = mutableListOf<Contact>()
        if (saved != null) {
            try {
                val array = JSONArray(saved)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(Contact(
                        id = obj.optString("id", UUID.randomUUID().toString()),
                        name = obj.getString("name"),
                        role = obj.optString("role", ""),
                        phone = obj.optString("phone", ""),
                        email = obj.optString("email", ""),
                        address = obj.optString("address", obj.optString("street", "")),

                        notes = obj.optString("notes", "")
                    ))
                }
            } catch (e: Exception) { Log.e(TAG, "Failed to load contacts", e) }
        }
        mutableStateListOf<Contact>().apply { addAll(list) }
    }

    LaunchedEffect(contacts.toList()) {
        val array = JSONArray()
        contacts.forEach { c ->
            val obj = JSONObject()
            obj.put("id", c.id)
            obj.put("name", c.name)
            obj.put("role", c.role)
            obj.put("phone", c.phone)
            obj.put("email", c.email)
            obj.put("address", c.address)

            obj.put("notes", c.notes)
            array.put(obj)
        }
        sharedPrefs.edit { putString("contacts", array.toString()) }
    }

    LaunchedEffect(medicationSchedules.toList()) {
        val array = JSONArray()
        medicationSchedules.forEach { sched ->
            val obj = JSONObject()
            obj.put("id", sched.id)
            obj.put("name", sched.name)
            obj.put("dose", sched.dose)
            obj.put("timing", sched.timing)
            obj.put("purpose", sched.purpose)
            obj.put("startDate", sched.startDate)
            obj.put("endDate", sched.endDate ?: "")
            array.put(obj)
        }
        sharedPrefs.edit { putString("medication_schedules", array.toString()) }
    }

    if (appointmentForDate != null) {
        DayAppointmentScreen(
            dateKey = appointmentForDate!!,
            appointments = appointments,
            contacts = contacts,
            onAdd = { appointments.add(it) },
            onUpdate = { updated ->
                val idx = appointments.indexOfFirst { it.id == updated.id }
                if (idx >= 0) appointments[idx] = updated
            },
            onRemove = { id -> appointments.removeAll { it.id == id } },
            onAddContact = { contacts.add(it) },
            onBack = { appointmentForDate = null }
        )
        return
    }

    if (medsForDate != null) {
        DayMedicationScreen(
            dateKey = medsForDate!!,
            allSchedules = medicationSchedules,
            onAddSchedule = { medicationSchedules.add(it) },
            onUpdateSchedule = { updated ->
                val idx = medicationSchedules.indexOfFirst { it.id == updated.id }
                if (idx >= 0) medicationSchedules[idx] = updated
            },
            onRemoveSchedule = { id -> medicationSchedules.removeAll { it.id == id } },
            onBack = { medsForDate = null }
        )
        return
    }

    val navItems = listOf(
        "tracker" to "Tracker",
        "calendar" to "Calendar",
        "meds" to "Meds",
        "notes" to "All Notes",
        "symptoms" to "Symptoms",
        "trends" to "Trends",
        "contacts" to "Contacts"
    )
    var navExpanded by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize().safeDrawingPadding()) {
        Box(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
            Row(
                modifier = Modifier
                    .clickable { navExpanded = true }
                    .padding(vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = navItems.find { it.first == currentScreen }?.second ?: "Menu",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
                Text("▾", fontSize = 16.sp, color = MaterialTheme.colorScheme.primary)
            }
            DropdownMenu(expanded = navExpanded, onDismissRequest = { navExpanded = false }) {
                navItems.forEach { (screen, label) ->
                    DropdownMenuItem(
                        text = {
                            Text(
                                text = label,
                                fontWeight = if (currentScreen == screen) FontWeight.Bold else FontWeight.Normal,
                                color = if (currentScreen == screen) MaterialTheme.colorScheme.primary else Color.Unspecified
                            )
                        },
                        onClick = { currentScreen = screen; navExpanded = false }
                    )
                }
            }
        }

        when (currentScreen) {
            "tracker" -> TrackerScreen(
                selectedWeekOffset = selectedWeekOffset,
                onWeekOffsetChange = { selectedWeekOffset = it },
                dayStatuses = dayStatuses,
                daySymptoms = daySymptoms,
                medicationSchedules = medicationSchedules,
                appointments = appointments,
                onShowMedsForDate = { medsForDate = it },
                onShowAppointmentsForDate = { appointmentForDate = it }
            )
            "calendar" -> CalendarView(
                dayStatuses = dayStatuses,
                appointments = appointments,
                onShowTracker = { dateKey ->
                    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    val date = sdf.parse(dateKey) ?: return@CalendarView
                    val today = Calendar.getInstance()
                    today.set(Calendar.HOUR_OF_DAY, 0); today.set(Calendar.MINUTE, 0)
                    today.set(Calendar.SECOND, 0); today.set(Calendar.MILLISECOND, 0)
                    today.set(Calendar.DAY_OF_WEEK, today.firstDayOfWeek)
                    val target = Calendar.getInstance().apply { time = date }
                    target.set(Calendar.DAY_OF_WEEK, target.firstDayOfWeek)
                    val diffMs = target.timeInMillis - today.timeInMillis
                    val diffWeeks = (diffMs / (7 * 24 * 60 * 60 * 1000)).toInt()
                    selectedWeekOffset = diffWeeks
                    currentScreen = "tracker"
                },
                onShowAppointments = { appointmentForDate = it }
            )
            "symptoms" -> SymptomsScreen(daySymptoms = daySymptoms)
            "trends" -> SymptomTrendsScreen(daySymptoms = daySymptoms)
            "meds" -> MedicationsScreen(
                schedules = medicationSchedules,
                onAdd = { medicationSchedules.add(it) },
                onUpdate = { updated ->
                    val idx = medicationSchedules.indexOfFirst { it.id == updated.id }
                    if (idx >= 0) medicationSchedules[idx] = updated
                },
                onRemove = { id -> medicationSchedules.removeAll { it.id == id } }
            )
            "contacts" -> ContactsScreen(
                contacts = contacts,
                onAdd = { contacts.add(it) },
                onUpdate = { updated ->
                    val idx = contacts.indexOfFirst { it.id == updated.id }
                    if (idx >= 0) contacts[idx] = updated
                },
                onRemove = { id -> contacts.removeAll { it.id == id } }
            )
            else -> NotesSummaryScreen(dayStatuses = dayStatuses, daySymptoms = daySymptoms)
        }
    }
}

// MARK: - Tracker screen

@Composable
fun TrackerScreen(
    selectedWeekOffset: Int,
    onWeekOffsetChange: (Int) -> Unit,
    dayStatuses: MutableMap<String, DayStatus>,
    daySymptoms: MutableMap<String, DaySymptoms>,
    medicationSchedules: List<MedicationSchedule>,
    appointments: List<Appointment>,
    onShowMedsForDate: (String) -> Unit,
    onShowAppointmentsForDate: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val calendar = Calendar.getInstance()

    val weekOptions = remember {
        (-35..0).map { offset ->
            val cal = Calendar.getInstance()
            cal.set(Calendar.DAY_OF_WEEK, cal.firstDayOfWeek)
            cal.add(Calendar.WEEK_OF_YEAR, offset)
            val formatter = SimpleDateFormat("MMM d", Locale.getDefault())
            val label = if (offset == 0) "Current Week (${formatter.format(cal.time)})"
                        else "Week of ${formatter.format(cal.time)}"
            offset to label
        }
    }

    val weekStartDate = remember(selectedWeekOffset) {
        calendar.time = Date()
        calendar.set(Calendar.DAY_OF_WEEK, calendar.firstDayOfWeek)
        calendar.add(Calendar.WEEK_OF_YEAR, selectedWeekOffset)
        calendar.time
    }
    val weekDates = remember(weekStartDate) {
        (0 until 7).map { offset ->
            Calendar.getInstance().apply {
                time = weekStartDate
                add(Calendar.DAY_OF_YEAR, offset)
            }.time
        }
    }
    val dayFormatter = remember { SimpleDateFormat("EEE", Locale.getDefault()) }
    val weekLabel = remember(weekStartDate) { SimpleDateFormat("MMM d", Locale.getDefault()).format(weekStartDate) }
    val todayKey = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    val todayBringIntoViewRequester = remember { BringIntoViewRequester() }

    Column(modifier = Modifier
        .fillMaxSize()
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp, vertical = 8.dp)) {
        Text(
            text = "PD Notes",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.medium,
            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    text = "Daily Tracker",
                    style = MaterialTheme.typography.titleLarge
                )

                ExposedDropdownMenuBox(
                        expanded = expanded,
                        onExpandedChange = { expanded = !expanded },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        TextField(
                            value = weekOptions.find { it.first == selectedWeekOffset }?.second ?: "Week of $weekLabel",
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                            modifier = Modifier.menuAnchor().fillMaxWidth()
                        )
                        ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            weekOptions.forEach { (offset, label) ->
                                DropdownMenuItem(
                                    text = { Text(label) },
                                    onClick = { onWeekOffsetChange(offset); expanded = false }
                                )
                            }
                        }
                    }

                        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        weekDates.forEach { date ->
                            val dayKey = remember(date) { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(date) }
                            val dayLabel = dayFormatter.format(date)
                            val status = dayStatuses[dayKey] ?: DayStatus()
                            val medsCount = schedulesForDate(medicationSchedules, dayKey).size
                            val dayAppts = appointmentsForDate(appointments, dayKey)
                            val apptCount = dayAppts.size

                            val isToday = dayKey == todayKey
                            if (isToday) {
                                LaunchedEffect(weekStartDate) {
                                    todayBringIntoViewRequester.bringIntoView()
                                }
                            }

                            Column(modifier = Modifier
                                .fillMaxWidth()
                                .then(if (isToday) Modifier.bringIntoViewRequester(todayBringIntoViewRequester) else Modifier)
                                .background(Color(0xFFF2F2F2), shape = MaterialTheme.shapes.small)
                                .padding(12.dp)) {
                                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Text(dayLabel, fontWeight = FontWeight.SemiBold, color = Color.Black)
                                    Spacer(modifier = Modifier.weight(1f))
                                    Text(
                                        text = if (apptCount > 0) "Appts ($apptCount)" else "Appts",
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 12.sp,
                                        modifier = Modifier.clickable { onShowAppointmentsForDate(dayKey) }
                                    )
                                    Spacer(modifier = Modifier.width(16.dp))
                                    Text(
                                        text = if (medsCount > 0) "Meds ($medsCount)" else "Meds",
                                        color = MaterialTheme.colorScheme.primary,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 12.sp,
                                        modifier = Modifier.clickable { onShowMedsForDate(dayKey) }
                                    )
                                }

                                if (apptCount > 0) {
                                    Column(modifier = Modifier.padding(top = 4.dp)) {
                                        dayAppts.forEach { appt ->
                                            Text(
                                                text = "• ${if (appt.time.isNotBlank()) "${formatTimeAmPm(appt.time)} " else ""}${appt.title}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color.DarkGray,
                                                modifier = Modifier.clickable { onShowAppointmentsForDate(dayKey) }
                                            )
                                        }
                                    }
                                }

                                Row(
                                    modifier = Modifier.padding(top = 8.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("Day Rating:", style = MaterialTheme.typography.bodySmall, color = Color.Black)
                                    RatingOption("😊", status.rating == DayRating.GOOD) {
                                        dayStatuses[dayKey] = status.copy(rating = DayRating.GOOD)
                                    }
                                    RatingOption("😐", status.rating == DayRating.NORMAL) {
                                        dayStatuses[dayKey] = status.copy(rating = DayRating.NORMAL)
                                    }
                                    RatingOption("🙁", status.rating == DayRating.BAD) {
                                        dayStatuses[dayKey] = status.copy(rating = DayRating.BAD)
                                    }
                                }

                                TextField(
                                    value = status.note,
                                    onValueChange = { dayStatuses[dayKey] = status.copy(note = it) },
                                    label = { Text("Daily Note", fontSize = 12.sp) },
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                    textStyle = MaterialTheme.typography.bodySmall.copy(color = Color.Black),
                                    colors = TextFieldDefaults.colors(
                                        focusedContainerColor = Color.Transparent,
                                        unfocusedContainerColor = Color.Transparent,
                                        unfocusedIndicatorColor = Color.LightGray.copy(alpha = 0.5f),
                                        focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                                        focusedTextColor = Color.Black,
                                        unfocusedTextColor = Color.Black
                                    )
                                )

                                TextField(
                                    value = status.exercise,
                                    onValueChange = { dayStatuses[dayKey] = status.copy(exercise = it) },
                                    label = { Text("Exercise", fontSize = 12.sp) },
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                    textStyle = MaterialTheme.typography.bodySmall.copy(color = Color.Black),
                                    minLines = 2,
                                    colors = TextFieldDefaults.colors(
                                        focusedContainerColor = Color.Transparent,
                                        unfocusedContainerColor = Color.Transparent,
                                        unfocusedIndicatorColor = Color.LightGray.copy(alpha = 0.5f),
                                        focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                                        focusedTextColor = Color.Black,
                                        unfocusedTextColor = Color.Black
                                    )
                                )

                                val symptoms = daySymptoms[dayKey] ?: DaySymptoms()
                                val symptomTextFieldColors = TextFieldDefaults.colors(
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent,
                                    unfocusedIndicatorColor = Color.LightGray.copy(alpha = 0.5f),
                                    focusedIndicatorColor = MaterialTheme.colorScheme.primary,
                                    focusedTextColor = Color.Black,
                                    unfocusedTextColor = Color.Black,
                                    focusedLabelColor = MaterialTheme.colorScheme.primary,
                                    unfocusedLabelColor = Color.Black
                                )
                                HorizontalDivider(modifier = Modifier.padding(top = 8.dp), color = Color.LightGray.copy(alpha = 0.5f))
                                Text("Symptoms", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color.Black, modifier = Modifier.padding(top = 4.dp))
                                listOf(
                                    "Pain" to symptoms.pain,
                                    "Tremors" to symptoms.tremors,
                                    "Legs" to symptoms.legs,
                                    "Plumbing" to symptoms.plumbing,
                                    "Neuropathy" to symptoms.neuropathy,
                                    "Sleep" to symptoms.sleep,
                                    "Diet" to symptoms.diet
                                ).forEach { (label, value) ->
                                    val severity = when (label) {
                                        "Pain" -> symptoms.painSeverity
                                        "Tremors" -> symptoms.tremorsSeverity
                                        "Legs" -> symptoms.legsSeverity
                                        "Plumbing" -> symptoms.plumbingSeverity
                                        "Neuropathy" -> symptoms.neuropathySeverity
                                        "Sleep" -> symptoms.sleepSeverity
                                        else -> symptoms.dietSeverity
                                    }
                                    Text(label, fontSize = 12.sp, color = Color.Black, modifier = Modifier.padding(top = 8.dp))
                                    SeverityRating(
                                        value = severity,
                                        onChange = { newSeverity ->
                                            val updated = when (label) {
                                                "Pain" -> symptoms.copy(painSeverity = newSeverity)
                                                "Tremors" -> symptoms.copy(tremorsSeverity = newSeverity)
                                                "Legs" -> symptoms.copy(legsSeverity = newSeverity)
                                                "Plumbing" -> symptoms.copy(plumbingSeverity = newSeverity)
                                                "Neuropathy" -> symptoms.copy(neuropathySeverity = newSeverity)
                                                "Sleep" -> symptoms.copy(sleepSeverity = newSeverity)
                                                else -> symptoms.copy(dietSeverity = newSeverity)
                                            }
                                            daySymptoms[dayKey] = updated
                                        },
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                    TextField(
                                        value = value,
                                        onValueChange = { newVal ->
                                            val updated = when (label) {
                                                "Pain" -> symptoms.copy(pain = newVal)
                                                "Tremors" -> symptoms.copy(tremors = newVal)
                                                "Legs" -> symptoms.copy(legs = newVal)
                                                "Plumbing" -> symptoms.copy(plumbing = newVal)
                                                "Neuropathy" -> symptoms.copy(neuropathy = newVal)
                                                "Sleep" -> symptoms.copy(sleep = newVal)
                                                else -> symptoms.copy(diet = newVal)
                                            }
                                            daySymptoms[dayKey] = updated
                                        },
                                        placeholder = { Text("Notes", fontSize = 12.sp, color = Color.DarkGray) },
                                        modifier = Modifier.fillMaxWidth().height(52.dp).verticalScroll(rememberScrollState()),
                                        textStyle = MaterialTheme.typography.bodySmall.copy(color = Color.Black),
                                        colors = symptomTextFieldColors
                                    )
                                }
                            }
                        }
                    }
                }
        }
    }
}

// MARK: - Day medication screen

@Composable
fun DayMedicationScreen(
    dateKey: String,
    allSchedules: List<MedicationSchedule>,
    onAddSchedule: (MedicationSchedule) -> Unit,
    onUpdateSchedule: (MedicationSchedule) -> Unit,
    onRemoveSchedule: (String) -> Unit,
    onBack: () -> Unit
) {
    val daySchedules = schedulesForDate(allSchedules, dateKey)
    var showAddForm by remember { mutableStateOf(false) }
    var editingSchedule by remember { mutableStateOf<MedicationSchedule?>(null) }

    Column(modifier = Modifier.fillMaxSize().safeDrawingPadding()) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "← Back",
                color = MaterialTheme.colorScheme.primary,
                fontSize = 16.sp,
                modifier = Modifier.clickable { onBack() }
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(text = dateKey, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.weight(1f))
            if (!showAddForm) {
                Text(
                    text = "+ Add",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { showAddForm = true }
                )
            }
        }

        HorizontalDivider()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            val currentEditing = editingSchedule
            if (currentEditing != null) {
                AddMedicationForm(
                    startDate = currentEditing.startDate,
                    existing = currentEditing,
                    onSave = { updated ->
                        onUpdateSchedule(updated)
                        editingSchedule = null
                    },
                    onCancel = { editingSchedule = null }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            } else if (showAddForm) {
                AddMedicationForm(
                    startDate = dateKey,
                    onSave = { schedule ->
                        onAddSchedule(schedule)
                        showAddForm = false
                    },
                    onCancel = { showAddForm = false }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            Text(
                text = "Medications for this day",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )

            if (daySchedules.isEmpty()) {
                Text("No medications scheduled for this day.", color = Color.DarkGray)
            } else {
                daySchedules.forEach { sched ->
                    MedicationScheduleCard(
                        sched = sched,
                        onRemove = onRemoveSchedule,
                        onUpdate = onUpdateSchedule
                    )
                }
            }
        }
    }
}

// MARK: - Add medication form

@Composable
fun AddMedicationForm(
    startDate: String,
    onSave: (MedicationSchedule) -> Unit,
    onCancel: () -> Unit,
    existing: MedicationSchedule? = null
) {
    val context = LocalContext.current
    val sdf = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }

    var name by remember { mutableStateOf(existing?.name ?: "") }
    var dose by remember { mutableStateOf(existing?.dose ?: "") }
    var timing by remember { mutableStateOf(existing?.timing ?: "") }
    var timingExpanded by remember { mutableStateOf(false) }
    var purpose by remember { mutableStateOf(existing?.purpose ?: "") }
    var pickedStartDate by remember { mutableStateOf(existing?.startDate ?: startDate) }
    var pickedEndDate by remember { mutableStateOf(existing?.endDate) }

    fun showDatePicker(current: String?, onPicked: (String) -> Unit) {
        val cal = Calendar.getInstance()
        if (current != null) cal.time = sdf.parse(current) ?: Date()
        DatePickerDialog(
            context,
            { _, y, m, d ->
                cal.set(y, m, d)
                onPicked(sdf.format(cal.time))
            },
            cal.get(Calendar.YEAR),
            cal.get(Calendar.MONTH),
            cal.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(if (existing != null) "Edit Medication" else "Add Medication", fontWeight = FontWeight.Bold, fontSize = 16.sp)

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = dose,
                    onValueChange = { dose = it },
                    label = { Text("Dose") },
                    modifier = Modifier.weight(1f),
                    singleLine = true
                )
                ExposedDropdownMenuBox(
                    expanded = timingExpanded,
                    onExpandedChange = { timingExpanded = it },
                    modifier = Modifier.weight(1f)
                ) {
                    OutlinedTextField(
                        value = timing,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("When") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = timingExpanded) },
                        modifier = Modifier.menuAnchor().fillMaxWidth(),
                        singleLine = true
                    )
                    ExposedDropdownMenu(
                        expanded = timingExpanded,
                        onDismissRequest = { timingExpanded = false }
                    ) {
                        listOf("Day", "Afternoon", "Night").forEach { option ->
                            DropdownMenuItem(
                                text = { Text(option) },
                                onClick = { timing = option; timingExpanded = false }
                            )
                        }
                    }
                }
            }
            OutlinedTextField(
                value = purpose,
                onValueChange = { purpose = it },
                label = { Text("Purpose") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            // Start date
            OutlinedTextField(
                value = pickedStartDate,
                onValueChange = {},
                label = { Text("Start date") },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showDatePicker(pickedStartDate) { pickedStartDate = it } },
                readOnly = true,
                enabled = false,
                colors = OutlinedTextFieldDefaults.colors(
                    disabledTextColor = MaterialTheme.colorScheme.onSurface,
                    disabledBorderColor = MaterialTheme.colorScheme.outline,
                    disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )

            // End date with ongoing toggle
            Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(
                    checked = pickedEndDate == null,
                    onCheckedChange = { ongoing ->
                        pickedEndDate = if (ongoing) null else pickedStartDate
                    }
                )
                Text(
                    "Ongoing",
                    modifier = Modifier.clickable {
                        pickedEndDate = if (pickedEndDate == null) pickedStartDate else null
                    }
                )
            }
            if (pickedEndDate != null) {
                OutlinedTextField(
                    value = pickedEndDate ?: "",
                    onValueChange = {},
                    label = { Text("End date") },
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showDatePicker(pickedEndDate) { pickedEndDate = it } },
                    readOnly = true,
                    enabled = false,
                    colors = OutlinedTextFieldDefaults.colors(
                        disabledTextColor = MaterialTheme.colorScheme.onSurface,
                        disabledBorderColor = MaterialTheme.colorScheme.outline,
                        disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) {
                    Text("Cancel")
                }
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            onSave(MedicationSchedule(
                                id = existing?.id ?: java.util.UUID.randomUUID().toString(),
                                name = name.trim(),
                                dose = dose.trim(),
                                timing = timing.trim(),
                                purpose = purpose.trim(),
                                startDate = pickedStartDate,
                                endDate = pickedEndDate
                            ))
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = name.isNotBlank()
                ) {
                    Text("Save")
                }
            }
        }
    }
}

// MARK: - Medications overview screen

@Composable
fun MedicationsScreen(
    schedules: List<MedicationSchedule>,
    onAdd: (MedicationSchedule) -> Unit,
    onUpdate: (MedicationSchedule) -> Unit,
    onRemove: (String) -> Unit
) {
    val today = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    val active = schedules.filter { it.startDate <= today && (it.endDate == null || it.endDate >= today) }
    val past = schedules.filter { it.endDate != null && it.endDate < today }
    var showAddForm by remember { mutableStateOf(false) }

    Column(modifier = Modifier
        .fillMaxSize()
        .verticalScroll(rememberScrollState())
        .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Medications", fontSize = 32.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
            if (!showAddForm) {
                Text(
                    text = "+ Add",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { showAddForm = true }
                )
            }
        }

        if (showAddForm) {
            AddMedicationForm(
                startDate = today,
                onSave = { schedule ->
                    onAdd(schedule)
                    showAddForm = false
                },
                onCancel = { showAddForm = false }
            )
            HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
        }

        if (schedules.isEmpty() && !showAddForm) {
            Text("No medications scheduled yet.", color = Color.DarkGray)
        } else {
            if (active.isNotEmpty()) {
                Text("Active", fontWeight = FontWeight.SemiBold, color = Color.DarkGray, fontSize = 13.sp)
                active.forEach { sched -> MedicationScheduleCard(sched, onRemove, onUpdate) }
            }
            if (past.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text("Past", fontWeight = FontWeight.SemiBold, color = Color.DarkGray, fontSize = 13.sp)
                past.forEach { sched -> MedicationScheduleCard(sched, onRemove, onUpdate) }
            }
        }
    }
}

@Composable
fun MedicationScheduleCard(sched: MedicationSchedule, onRemove: (String) -> Unit, onUpdate: (MedicationSchedule) -> Unit) {
    var editing by remember { mutableStateOf(false) }
    if (editing) {
        AddMedicationForm(
            startDate = sched.startDate,
            existing = sched,
            onSave = { updated -> onUpdate(updated); editing = false },
            onCancel = { editing = false }
        )
    } else {
        Card(
            modifier = Modifier.fillMaxWidth().clickable { editing = true },
            shape = MaterialTheme.shapes.medium,
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(sched.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    if (sched.dose.isNotBlank()) Text("Dose: ${sched.dose}", fontSize = 13.sp, color = Color.DarkGray)
                    if (sched.timing.isNotBlank()) Text("When: ${sched.timing}", fontSize = 13.sp, color = Color.DarkGray)
                    if (sched.purpose.isNotBlank()) Text("Purpose: ${sched.purpose}", fontSize = 13.sp, color = Color.DarkGray)
                    Text(
                        text = if (sched.endDate == null) "From ${sched.startDate} onwards"
                               else "${sched.startDate} – ${sched.endDate}",
                        fontSize = 11.sp,
                        color = Color.DarkGray,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }
                Text(
                    "✕",
                    color = Color.Red,
                    fontSize = 18.sp,
                    modifier = Modifier.padding(start = 8.dp).clickable { onRemove(sched.id) }
                )
            }
        }
    }
}

// MARK: - Notes summary screen

fun daySymptomsHasContent(s: DaySymptoms): Boolean =
    s.tremors.isNotBlank() || s.legs.isNotBlank() || s.plumbing.isNotBlank() ||
    s.neuropathy.isNotBlank() || s.sleep.isNotBlank() || s.diet.isNotBlank() || s.pain.isNotBlank() ||
    s.tremorsSeverity > 0 || s.legsSeverity > 0 || s.plumbingSeverity > 0 ||
    s.neuropathySeverity > 0 || s.sleepSeverity > 0 || s.dietSeverity > 0 || s.painSeverity > 0

@Composable
fun NotesSummaryScreen(
    dayStatuses: MutableMap<String, DayStatus>,
    daySymptoms: Map<String, DaySymptoms>
) {
    var showRead by remember { mutableStateOf(false) }
    var showBadDaysOnly by remember { mutableStateOf(false) }

    val relevantDates = (dayStatuses.filterValues { it.note.isNotBlank() || it.exercise.isNotBlank() }.keys +
        daySymptoms.filterValues { daySymptomsHasContent(it) }.keys).toSet()

    val filteredNotes = relevantDates
        .map { date -> date to (dayStatuses[date] ?: DayStatus()) }
        .filter { (_, status) ->
            (showRead || !status.isRead) &&
            (!showBadDaysOnly || status.rating == DayRating.BAD)
        }
        .sortedByDescending { it.first }

    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text(
            text = "All Daily Notes",
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.padding(bottom = 8.dp)
        )

        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (filteredNotes.any { !it.second.isRead }) {
                Text(
                    text = "Mark All Read",
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.clickable {
                        relevantDates.forEach { date ->
                            val status = dayStatuses[date] ?: DayStatus()
                            if (!status.isRead) dayStatuses[date] = status.copy(isRead = true)
                        }
                    }
                )
            }
            Text(
                text = if (showRead) "Hide Read" else "Show Read",
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { showRead = !showRead }
            )
            Text(
                text = if (showBadDaysOnly) "All Days" else "Bad Days Only",
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.clickable { showBadDaysOnly = !showBadDaysOnly }
            )
        }

        if (filteredNotes.isEmpty()) {
            Box(modifier = Modifier.fillMaxWidth().padding(top = 32.dp), contentAlignment = Alignment.Center) {
                Text(
                    text = when {
                        showBadDaysOnly -> "No bad days recorded."
                        showRead -> "No notes recorded yet."
                        else -> "All notes marked as read."
                    },
                    color = Color.DarkGray
                )
            }
        } else {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                filteredNotes.forEach { (date, status) ->
                    val symptoms = daySymptoms[date] ?: DaySymptoms()
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = if (status.isRead) Color(0xFFE8E8E8) else Color(0xFFF2F2F2)
                        )
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = date,
                                    fontWeight = FontWeight.Bold,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (status.isRead) Color.DarkGray else Color.Black
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = when (status.rating) {
                                        DayRating.GOOD -> "😊"
                                        DayRating.NORMAL -> "😐"
                                        DayRating.BAD -> "🙁"
                                    },
                                    fontSize = 18.sp,
                                    modifier = Modifier.alpha(if (status.isRead) 0.5f else 1f)
                                )
                                Spacer(modifier = Modifier.weight(1f))
                                Text(
                                    text = if (status.isRead) "Unarchive" else "Mark Read",
                                    fontSize = 12.sp,
                                    color = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.clickable {
                                        dayStatuses[date] = status.copy(isRead = !status.isRead)
                                    }
                                )
                            }

                            if (status.note.isNotBlank()) {
                                Text(
                                    text = status.note,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = if (status.isRead) Color.DarkGray else Color.Black,
                                    modifier = Modifier.padding(top = 8.dp)
                                )
                            }

                            if (status.exercise.isNotBlank()) {
                                Text(
                                    text = "• Exercise: ${status.exercise}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (status.isRead) Color.DarkGray else Color.Black,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }

                            if (daySymptomsHasContent(symptoms)) {
                                Column(modifier = Modifier.padding(top = 8.dp)) {
                                    Text(
                                        text = "Symptoms",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = if (status.isRead) Color.DarkGray else Color.Black
                                    )
                                    listOf(
                                        Triple("Pain", symptoms.pain, symptoms.painSeverity),
                                        Triple("Tremors", symptoms.tremors, symptoms.tremorsSeverity),
                                        Triple("Legs", symptoms.legs, symptoms.legsSeverity),
                                        Triple("Plumbing", symptoms.plumbing, symptoms.plumbingSeverity),
                                        Triple("Neuropathy", symptoms.neuropathy, symptoms.neuropathySeverity),
                                        Triple("Sleep", symptoms.sleep, symptoms.sleepSeverity),
                                        Triple("Diet", symptoms.diet, symptoms.dietSeverity)
                                    ).forEach { (label, value, severity) ->
                                        if (value.isNotBlank() || severity > 0) {
                                            val severityText = if (severity > 0) " (${severityDisplay(severity)})" else ""
                                            val valueText = if (value.isNotBlank()) ": $value" else ""
                                            Text(
                                                text = "• $label$severityText$valueText",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = if (status.isRead) Color.DarkGray else Color.Black,
                                                modifier = Modifier.padding(top = 2.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Calendar view

@Composable
fun CalendarView(
    dayStatuses: Map<String, DayStatus>,
    appointments: List<Appointment>,
    onShowTracker: (String) -> Unit,
    onShowAppointments: (String) -> Unit
) {
    val isPortrait = LocalConfiguration.current.orientation == Configuration.ORIENTATION_PORTRAIT
    val cellAspectRatio = if (isPortrait) 1f / 1.60f else 1f / 1.20f

    val nowCal = remember { Calendar.getInstance() }
    var selectedYear by remember { mutableIntStateOf(nowCal.get(Calendar.YEAR)) }
    var selectedMonth by remember { mutableIntStateOf(nowCal.get(Calendar.MONTH)) }
    var tappedDay by remember { mutableStateOf<String?>(null) }

    tappedDay?.let { dayKey ->
        AlertDialog(
            onDismissRequest = { tappedDay = null },
            title = { Text(dayKey) },
            text = { Text("Open this day in:") },
            confirmButton = {
                TextButton(onClick = { tappedDay = null; onShowTracker(dayKey) }) {
                    Text("Daily Tracker")
                }
            },
            dismissButton = {
                TextButton(onClick = { tappedDay = null; onShowAppointments(dayKey) }) {
                    Text("Appointments")
                }
            }
        )
    }

    val weeksInMonth = remember(selectedYear, selectedMonth) {
        val cal = Calendar.getInstance()
        cal.set(selectedYear, selectedMonth, 1)
        val firstDayOfMonth = cal.get(Calendar.DAY_OF_WEEK)
        cal.add(Calendar.DAY_OF_YEAR, -(firstDayOfMonth - cal.firstDayOfWeek))
        val start = cal.time
        (0 until 6).map { w ->
            (0 until 7).map { d ->
                Calendar.getInstance().apply { time = start; add(Calendar.DAY_OF_YEAR, w * 7 + d) }.time
            }
        }
    }

    val todayKey = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()) }
    val dayLabelFormatter = remember { SimpleDateFormat("EEE", Locale.getDefault()) }
    val monthLabel = remember(selectedYear, selectedMonth) {
        val cal = Calendar.getInstance()
        cal.set(selectedYear, selectedMonth, 1)
        SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(cal.time)
    }

    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextButton(onClick = {
                if (selectedMonth == 0) { selectedMonth = 11; selectedYear-- }
                else selectedMonth--
            }) { Text("‹", fontSize = 24.sp) }
            Text(monthLabel, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            TextButton(onClick = {
                if (selectedMonth == 11) { selectedMonth = 0; selectedYear++ }
                else selectedMonth++
            }) { Text("›", fontSize = 24.sp) }
        }

        Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)) {
            (0 until 7).forEach { dayIndex ->
                Text(
                    text = dayLabelFormatter.format(weeksInMonth.first()[dayIndex]),
                    modifier = Modifier.weight(1f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
            }
        }

        weeksInMonth.forEach { weekDates ->
            val currentMonth = selectedMonth
            if (weekDates.any { Calendar.getInstance().apply { time = it }.get(Calendar.MONTH) == currentMonth }) {
                Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    weekDates.forEach { date ->
                        val dCal = Calendar.getInstance().apply { time = date }
                        val isSameMonth = dCal.get(Calendar.MONTH) == currentMonth
                        val dayKey = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(date)
                        val status = dayStatuses[dayKey] ?: DayStatus()
                        val dayNum = dCal.get(Calendar.DAY_OF_MONTH)
                        val apptCount = appointmentsForDate(appointments, dayKey).size
                        val isToday = dayKey == todayKey
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .aspectRatio(cellAspectRatio)
                                .padding(2.dp)
                                .background(
                                    if (isSameMonth) Color(0xFFF2F2F2) else Color.Transparent,
                                    shape = MaterialTheme.shapes.extraSmall
                                )
                                .then(
                                    if (isToday) Modifier.border(
                                        2.dp,
                                        MaterialTheme.colorScheme.primary,
                                        shape = MaterialTheme.shapes.extraSmall
                                    ) else Modifier
                                )
                                .then(if (isSameMonth) Modifier.clickable { tappedDay = dayKey } else Modifier),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isSameMonth) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = dayNum.toString(),
                                        fontSize = 10.sp,
                                        color = Color.Black,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = when (status.rating) {
                                            DayRating.GOOD -> "😊"; DayRating.NORMAL -> "😐"; DayRating.BAD -> "🙁"
                                        },
                                        fontSize = 14.sp
                                    )
                                    val dayAppts = appointmentsForDate(appointments, dayKey)
                                    if (dayAppts.isNotEmpty()) {
                                        if (isPortrait) {
                                            Box(
                                                modifier = Modifier
                                                    .padding(top = 2.dp)
                                                    .fillMaxWidth(0.7f)
                                                    .height(3.dp)
                                                    .background(MaterialTheme.colorScheme.primary, shape = MaterialTheme.shapes.extraSmall)
                                            )
                                        } else {
                                            dayAppts.take(2).forEach { appt ->
                                                Text(
                                                    text = if (appt.time.isNotEmpty()) "${formatTimeAmPm(appt.time)} ${appt.title}" else appt.title,
                                                    fontSize = 7.sp,
                                                    color = MaterialTheme.colorScheme.primary,
                                                    fontWeight = FontWeight.Medium,
                                                    maxLines = 1,
                                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 2.dp)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Appointment screens

@Composable
fun DayAppointmentScreen(
    dateKey: String,
    appointments: List<Appointment>,
    contacts: SnapshotStateList<Contact>,
    onAdd: (Appointment) -> Unit,
    onUpdate: (Appointment) -> Unit,
    onRemove: (String) -> Unit,
    onAddContact: (Contact) -> Unit,
    onBack: () -> Unit
) {
    val dayAppts = appointmentsForDate(appointments, dateKey)
    var showAddForm by remember { mutableStateOf(false) }
    var editingAppt by remember { mutableStateOf<Appointment?>(null) }

    Column(modifier = Modifier.fillMaxSize().safeDrawingPadding()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "← Back",
                color = MaterialTheme.colorScheme.primary,
                fontSize = 16.sp,
                modifier = Modifier.clickable { onBack() }
            )
            Spacer(modifier = Modifier.width(16.dp))
            Text(text = dateKey, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.weight(1f))
            if (!showAddForm && editingAppt == null) {
                Text(
                    text = "+ Add",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { showAddForm = true }
                )
            }
        }

        HorizontalDivider()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (showAddForm) {
                AppointmentForm(
                    date = dateKey,
                    initial = null,
                    contacts = contacts,
                    onAddContact = onAddContact,
                    onSave = { appt ->
                        onAdd(appt)
                        showAddForm = false
                    },
                    onCancel = { showAddForm = false }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            if (editingAppt != null) {
                AppointmentForm(
                    date = dateKey,
                    initial = editingAppt,
                    contacts = contacts,
                    onAddContact = onAddContact,
                    onSave = { appt ->
                        onUpdate(appt)
                        editingAppt = null
                    },
                    onCancel = { editingAppt = null }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            Text("Appointments", fontSize = 20.sp, fontWeight = FontWeight.Bold)

            if (dayAppts.isEmpty()) {
                Text("No appointments for this day.", color = Color.DarkGray)
            } else {
                dayAppts.forEach { appt ->
                    val isBeingEdited = editingAppt?.id == appt.id
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { editingAppt = appt; showAddForm = false },
                        shape = MaterialTheme.shapes.medium,
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (isBeingEdited)
                                MaterialTheme.colorScheme.primaryContainer
                            else
                                MaterialTheme.colorScheme.surface
                        )
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (appt.time.isNotBlank()) {
                                        Text(
                                            text = formatTimeAmPm(appt.time),
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.primary,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(end = 8.dp)
                                        )
                                    }
                                    Text(appt.title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                                }
                                if (appt.location.isNotBlank()) {
                                    Text("📍 ${appt.location}", fontSize = 13.sp, color = Color.DarkGray, modifier = Modifier.padding(top = 2.dp))
                                }
                                val linkedContact = contacts.firstOrNull { it.id == appt.contactId }
                                if (linkedContact != null) {
                                    val label = if (linkedContact.role.isNotBlank()) "${linkedContact.name} (${linkedContact.role})" else linkedContact.name
                                    Text("👤 $label", fontSize = 13.sp, color = Color.DarkGray, modifier = Modifier.padding(top = 2.dp))
                                }
                                if (appt.notes.isNotBlank()) {
                                    Text(appt.notes, fontSize = 13.sp, color = Color.DarkGray, modifier = Modifier.padding(top = 4.dp))
                                }
                            }
                            Text(
                                "✕",
                                color = Color.Red,
                                fontSize = 18.sp,
                                modifier = Modifier.padding(start = 8.dp).clickable { onRemove(appt.id) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AppointmentForm(
    date: String,
    initial: Appointment?,
    contacts: SnapshotStateList<Contact>,
    onAddContact: (Contact) -> Unit,
    onSave: (Appointment) -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current
    var title by remember(initial?.id) { mutableStateOf(initial?.title ?: "") }
    var time by remember(initial?.id) { mutableStateOf(initial?.time ?: "") }
    var location by remember(initial?.id) { mutableStateOf(initial?.location ?: "") }
    var notes by remember(initial?.id) { mutableStateOf(initial?.notes ?: "") }
    var selectedContactId by remember(initial?.id) { mutableStateOf(initial?.contactId) }
    var showContactPicker by remember { mutableStateOf(false) }
    var showAddContact by remember { mutableStateOf(false) }

    fun showTimePicker() {
        val parts = time.split(":")
        val initH = parts.getOrNull(0)?.toIntOrNull() ?: 9
        val initM = parts.getOrNull(1)?.toIntOrNull() ?: 0
        TimePickerDialog(context, { _, h, m ->
            time = "%02d:%02d".format(h, m)
        }, initH, initM, false).show()
    }

    val selectedContact = contacts.firstOrNull { it.id == selectedContactId }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = if (initial == null) "New Appointment" else "Edit Appointment",
                fontWeight = FontWeight.Bold,
                fontSize = 16.sp
            )

            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text("Title") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = formatTimeAmPm(time),
                onValueChange = {},
                label = { Text("Time (optional)") },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showTimePicker() },
                readOnly = true,
                enabled = false,
                trailingIcon = {
                    if (time.isNotBlank()) {
                        Text(
                            "✕",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp,
                            modifier = Modifier.clickable { time = "" }.padding(8.dp)
                        )
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    disabledTextColor = MaterialTheme.colorScheme.onSurface,
                    disabledBorderColor = MaterialTheme.colorScheme.outline,
                    disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    disabledTrailingIconColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )
            OutlinedTextField(
                value = location,
                onValueChange = { location = it },
                label = { Text("Location (optional)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )

            // Contact section
            Text("Contact", fontWeight = FontWeight.Medium, fontSize = 14.sp)

            // Tappable field showing current selection
            OutlinedTextField(
                value = selectedContact?.let {
                    if (it.role.isNotBlank()) "${it.name} (${it.role})" else it.name
                } ?: "None",
                onValueChange = {},
                label = { Text("Contact (optional)") },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showContactPicker = !showContactPicker; showAddContact = false },
                readOnly = true,
                enabled = false,
                trailingIcon = {
                    if (selectedContactId != null) {
                        Text(
                            "✕",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .clickable { selectedContactId = null; showContactPicker = false }
                                .padding(8.dp)
                        )
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    disabledTextColor = MaterialTheme.colorScheme.onSurface,
                    disabledBorderColor = MaterialTheme.colorScheme.outline,
                    disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    disabledTrailingIconColor = MaterialTheme.colorScheme.onSurfaceVariant
                )
            )

            if (showContactPicker) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.small,
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column {
                        contacts.forEach { contact ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedContactId = contact.id
                                        if (contact.address.isNotBlank()) location = contact.address
                                        showContactPicker = false
                                    }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(contact.name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                    if (contact.role.isNotBlank())
                                        Text(contact.role, fontSize = 12.sp, color = Color.DarkGray)
                                }
                                if (contact.id == selectedContactId) {
                                    Text("✓", color = MaterialTheme.colorScheme.primary, fontSize = 14.sp)
                                }
                            }
                            HorizontalDivider()
                        }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showAddContact = !showAddContact; showContactPicker = false }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "+ Add new contact",
                                color = MaterialTheme.colorScheme.primary,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            if (showAddContact) {
                ContactForm(
                    initial = null,
                    onSave = { newContact ->
                        onAddContact(newContact)
                        selectedContactId = newContact.id
                        if (newContact.address.isNotBlank()) location = newContact.address
                        showAddContact = false
                    },
                    onCancel = { showAddContact = false }
                )
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = {
                        if (title.isNotBlank()) {
                            onSave(Appointment(
                                id = initial?.id ?: UUID.randomUUID().toString(),
                                date = date,
                                title = title.trim(),
                                time = time.trim(),
                                location = location.trim(),
                                notes = notes.trim(),
                                contactId = selectedContactId
                            ))
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = title.isNotBlank()
                ) { Text(if (initial == null) "Save" else "Update") }
            }
        }
    }
}

// MARK: - Symptoms summary screen

@Composable
fun SymptomsScreen(daySymptoms: Map<String, DaySymptoms>) {
    val entries = daySymptoms
        .filter { (_, s) -> daySymptomsHasContent(s) }
        .toList()
        .sortedByDescending { it.first }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Symptoms", fontSize = 32.sp, fontWeight = FontWeight.Bold)

        if (entries.isEmpty()) {
            Text("No symptoms recorded yet.", color = Color.DarkGray)
        } else {
            entries.forEach { (date, s) ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(date, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        HorizontalDivider(modifier = Modifier.padding(vertical = 4.dp))
                        listOf(
                            Triple("Pain", s.pain, s.painSeverity),
                            Triple("Tremors", s.tremors, s.tremorsSeverity),
                            Triple("Legs", s.legs, s.legsSeverity),
                            Triple("Plumbing", s.plumbing, s.plumbingSeverity),
                            Triple("Neuropathy", s.neuropathy, s.neuropathySeverity),
                            Triple("Sleep", s.sleep, s.sleepSeverity),
                            Triple("Diet", s.diet, s.dietSeverity)
                        ).filter { it.second.isNotBlank() || it.third > 0 }.forEach { (label, value, severity) ->
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = if (severity > 0) "$label (${severityDisplay(severity)}): " else "$label: ",
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp,
                                    color = if (severity > 0) severityColor(severity) else MaterialTheme.colorScheme.primary
                                )
                                Text(value, fontSize = 13.sp, color = Color.Black)
                            }
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Symptom trends screen

private val trendSymptomFields: List<Pair<String, (DaySymptoms) -> Int>> = listOf(
    "Pain" to { it.painSeverity },
    "Tremors" to { it.tremorsSeverity },
    "Legs" to { it.legsSeverity },
    "Plumbing" to { it.plumbingSeverity },
    "Neuropathy" to { it.neuropathySeverity },
    "Sleep" to { it.sleepSeverity },
    "Diet" to { it.dietSeverity }
)

@Composable
fun SymptomTrendsScreen(daySymptoms: Map<String, DaySymptoms>) {
    var selectedSymptom by remember { mutableStateOf(trendSymptomFields.first().first) }
    var selectedRange by remember { mutableStateOf(TrendRange.WEEK) }

    val sdf = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }
    val todayKey = remember { sdf.format(Calendar.getInstance().time) }
    val cutoffKey = remember(selectedRange) {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -selectedRange.days)
        sdf.format(cal.time)
    }

    val extractor = trendSymptomFields.first { it.first == selectedSymptom }.second
    val points = remember(daySymptoms.toMap(), selectedSymptom, cutoffKey, todayKey) {
        daySymptoms
            .mapNotNull { (date, s) ->
                val severity = extractor(s)
                if (date in cutoffKey..todayKey && severity > 0) date to severity else null
            }
            .sortedBy { it.first }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text("Symptom Trends", fontSize = 28.sp, fontWeight = FontWeight.Bold)

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TrendRange.values().forEach { range ->
                val selected = range == selectedRange
                Box(
                    modifier = Modifier
                        .background(
                            if (selected) MaterialTheme.colorScheme.primary else Color.Transparent,
                            shape = MaterialTheme.shapes.small
                        )
                        .border(
                            width = 1.dp,
                            color = if (selected) MaterialTheme.colorScheme.primary else Color.LightGray,
                            shape = MaterialTheme.shapes.small
                        )
                        .clickable { selectedRange = range }
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = range.label,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = if (selected) Color.White else Color.DarkGray
                    )
                }
            }
        }

        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            trendSymptomFields.forEach { (label, _) ->
                val selected = label == selectedSymptom
                Box(
                    modifier = Modifier
                        .background(
                            if (selected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                            shape = MaterialTheme.shapes.small
                        )
                        .border(
                            width = 1.dp,
                            color = if (selected) MaterialTheme.colorScheme.primary else Color.LightGray,
                            shape = MaterialTheme.shapes.small
                        )
                        .clickable { selectedSymptom = label }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(label, fontSize = 12.sp, color = Color.Black)
                }
            }
        }

        if (points.isEmpty()) {
            Text(
                text = "No $selectedSymptom ratings recorded in this range.",
                color = Color.DarkGray,
                modifier = Modifier.padding(top = 24.dp)
            )
        } else {
            SymptomLineChart(
                points = points,
                rangeStartKey = cutoffKey,
                rangeEndKey = todayKey,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
fun SymptomLineChart(
    points: List<Pair<String, Int>>,
    rangeStartKey: String,
    rangeEndKey: String,
    modifier: Modifier = Modifier
) {
    val sdf = remember { SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()) }
    val displayFormat = remember { SimpleDateFormat("MMM d", Locale.getDefault()) }
    val startMillis = remember(rangeStartKey) { sdf.parse(rangeStartKey)?.time ?: 0L }
    val endMillis = remember(rangeEndKey) { (sdf.parse(rangeEndKey)?.time ?: 1L).coerceAtLeast(startMillis + 1L) }
    val totalSpan = (endMillis - startMillis).toFloat()
    val lineColor = MaterialTheme.colorScheme.primary
    val gridColor = Color.LightGray.copy(alpha = 0.5f)

    Column(modifier = modifier) {
        Row(modifier = Modifier.fillMaxWidth().height(200.dp)) {
            Column(
                modifier = Modifier.fillMaxHeight().width(64.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text("5 - Terrible", fontSize = 10.sp, color = severityColor(5))
                Text("4", fontSize = 10.sp, color = severityColor(4))
                Text("3 - Fine", fontSize = 10.sp, color = severityColor(3))
                Text("2", fontSize = 10.sp, color = severityColor(2))
                Text("1 - Great", fontSize = 10.sp, color = severityColor(1))
            }
            Canvas(modifier = Modifier.fillMaxHeight().weight(1f)) {
                val w = size.width
                val h = size.height
                val stepY = h / 4f
                fun yFor(level: Int) = h - (level - 1) * stepY
                fun xFor(dateKey: String): Float {
                    val millis = sdf.parse(dateKey)?.time ?: startMillis
                    val frac = ((millis - startMillis) / totalSpan).coerceIn(0f, 1f)
                    return frac * w
                }

                listOf(1, 3, 5).forEach { level ->
                    drawLine(
                        color = gridColor,
                        start = Offset(0f, yFor(level)),
                        end = Offset(w, yFor(level)),
                        strokeWidth = 1.dp.toPx()
                    )
                }

                val offsets = points.map { (date, severity) -> Offset(xFor(date), yFor(severity)) }
                for (i in 0 until offsets.size - 1) {
                    drawLine(
                        color = lineColor,
                        start = offsets[i],
                        end = offsets[i + 1],
                        strokeWidth = 3.dp.toPx(),
                        cap = StrokeCap.Round
                    )
                }
                offsets.forEachIndexed { idx, offset ->
                    drawCircle(color = severityColor(points[idx].second), radius = 5.dp.toPx(), center = offset)
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(start = 64.dp, top = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(displayFormat.format(Date(startMillis)), fontSize = 10.sp, color = Color.DarkGray)
            Text(displayFormat.format(Date(endMillis)), fontSize = 10.sp, color = Color.DarkGray)
        }
    }
}

// MARK: - Contacts screen

@Composable
fun ContactsScreen(
    contacts: List<Contact>,
    onAdd: (Contact) -> Unit,
    onUpdate: (Contact) -> Unit,
    onRemove: (String) -> Unit
) {
    var showAddForm by remember { mutableStateOf(false) }
    var editingContact by remember { mutableStateOf<Contact?>(null) }
    val sorted = contacts.sortedBy { it.name }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Contacts", fontSize = 28.sp, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.weight(1f))
            if (!showAddForm && editingContact == null) {
                Text(
                    text = "+ Add",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable { showAddForm = true }
                )
            }
        }

        HorizontalDivider()

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (showAddForm) {
                ContactForm(
                    initial = null,
                    onSave = { onAdd(it); showAddForm = false },
                    onCancel = { showAddForm = false }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            if (editingContact != null) {
                ContactForm(
                    initial = editingContact,
                    onSave = { onUpdate(it); editingContact = null },
                    onCancel = { editingContact = null }
                )
                HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            }

            if (sorted.isEmpty() && !showAddForm) {
                Text("No contacts yet. Tap + Add to create one.", color = Color.DarkGray)
            }

            sorted.forEach { contact ->
                val isEditing = editingContact?.id == contact.id
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { editingContact = contact; showAddForm = false },
                    shape = MaterialTheme.shapes.medium,
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isEditing)
                            MaterialTheme.colorScheme.primaryContainer
                        else
                            MaterialTheme.colorScheme.surface
                    )
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(contact.name, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                            if (contact.role.isNotBlank()) {
                                Text(contact.role, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary)
                            }
                            if (contact.phone.isNotBlank()) {
                                Text("📞 ${contact.phone}", fontSize = 13.sp, color = Color.DarkGray, modifier = Modifier.padding(top = 2.dp))
                            }
                            if (contact.email.isNotBlank()) {
                                Text("✉ ${contact.email}", fontSize = 13.sp, color = Color.DarkGray)
                            }
                            if (contact.address.isNotBlank()) {
                                Text("📍 ${contact.address}", fontSize = 13.sp, color = Color.DarkGray)
                            }
                            if (contact.notes.isNotBlank()) {
                                Text(contact.notes, fontSize = 13.sp, color = Color.DarkGray, modifier = Modifier.padding(top = 4.dp))
                            }
                        }
                        Text(
                            "✕",
                            color = Color.Red,
                            fontSize = 18.sp,
                            modifier = Modifier.padding(start = 8.dp).clickable { onRemove(contact.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ContactForm(
    initial: Contact?,
    onSave: (Contact) -> Unit,
    onCancel: () -> Unit
) {
    val context = LocalContext.current
    var name by remember(initial?.id) { mutableStateOf(initial?.name ?: "") }
    var role by remember(initial?.id) { mutableStateOf(initial?.role ?: "") }
    var phone by remember(initial?.id) { mutableStateOf(initial?.phone ?: "") }
    var email by remember(initial?.id) { mutableStateOf(initial?.email ?: "") }
    var address by remember(initial?.id) { mutableStateOf(initial?.address ?: "") }
    var notes by remember(initial?.id) { mutableStateOf(initial?.notes ?: "") }

    val contactPickerLauncher = rememberLauncherForActivityResult(ActivityResultContracts.PickContact()) { uri ->
        uri ?: return@rememberLauncherForActivityResult
        val resolver = context.contentResolver
        resolver.query(uri, arrayOf(ContactsContract.Contacts.DISPLAY_NAME, ContactsContract.Contacts._ID), null, null, null)?.use { c ->
            if (c.moveToFirst()) {
                name = c.getString(c.getColumnIndexOrThrow(ContactsContract.Contacts.DISPLAY_NAME)) ?: name
                val contactId = c.getString(c.getColumnIndexOrThrow(ContactsContract.Contacts._ID))
                resolver.query(
                    ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                    arrayOf(ContactsContract.CommonDataKinds.Phone.NUMBER),
                    "${ContactsContract.CommonDataKinds.Phone.CONTACT_ID} = ?",
                    arrayOf(contactId), null
                )?.use { pc -> if (pc.moveToFirst()) phone = pc.getString(pc.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Phone.NUMBER)) ?: phone }
                resolver.query(
                    ContactsContract.CommonDataKinds.Email.CONTENT_URI,
                    arrayOf(ContactsContract.CommonDataKinds.Email.ADDRESS),
                    "${ContactsContract.CommonDataKinds.Email.CONTACT_ID} = ?",
                    arrayOf(contactId), null
                )?.use { ec -> if (ec.moveToFirst()) email = ec.getString(ec.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.Email.ADDRESS)) ?: email }
                resolver.query(
                    ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_URI,
                    arrayOf(ContactsContract.CommonDataKinds.StructuredPostal.FORMATTED_ADDRESS),
                    "${ContactsContract.CommonDataKinds.StructuredPostal.CONTACT_ID} = ?",
                    arrayOf(contactId), null
                )?.use { ac ->
                    if (ac.moveToFirst()) {
                        val raw = ac.getString(ac.getColumnIndexOrThrow(ContactsContract.CommonDataKinds.StructuredPostal.FORMATTED_ADDRESS))?.trim() ?: ""
                        if (raw.isNotBlank()) address = raw
                    }
                }
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) contactPickerLauncher.launch(null)
    }

    fun launchPicker() {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED) {
            contactPickerLauncher.launch(null)
        } else {
            permissionLauncher.launch(Manifest.permission.READ_CONTACTS)
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (initial == null) "New Contact" else "Edit Contact",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "Import from Contacts",
                    color = MaterialTheme.colorScheme.primary,
                    fontSize = 13.sp,
                    modifier = Modifier.clickable { launchPicker() }
                )
            }
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = role,
                onValueChange = { role = it },
                label = { Text("Role (e.g. Neurologist)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )
            OutlinedTextField(
                value = phone,
                onValueChange = { phone = it },
                label = { Text("Phone") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone
                )
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Email
                )
            )
            OutlinedTextField(
                value = address,
                onValueChange = { address = it },
                label = { Text("Address (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )
            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notes (optional)") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 2
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) { Text("Cancel") }
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            onSave(Contact(
                                id = initial?.id ?: UUID.randomUUID().toString(),
                                name = name.trim(),
                                role = role.trim(),
                                phone = phone.trim(),
                                email = email.trim(),
                                address = address.trim(),
                                notes = notes.trim()
                            ))
                        }
                    },
                    modifier = Modifier.weight(1f),
                    enabled = name.isNotBlank()
                ) { Text(if (initial == null) "Save" else "Update") }
            }
        }
    }
}

// MARK: - Small reusable composables

@Composable
fun RatingOption(icon: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(32.dp)
            .background(
                if (selected) MaterialTheme.colorScheme.primaryContainer else Color.Transparent,
                shape = MaterialTheme.shapes.small
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(icon, fontSize = 18.sp)
    }
}

// 1 = mildest (green) ... 5 = worst (red)
fun severityColor(level: Int): Color = when (level) {
    1 -> Color(0xFF4CAF50)
    2 -> Color(0xFF8BC34A)
    3 -> Color(0xFFFFC107)
    4 -> Color(0xFFFF9800)
    5 -> Color(0xFFF44336)
    else -> Color.LightGray
}

private val severityLabels = mapOf(1 to "Great", 2 to "Good", 3 to "Fine", 4 to "Bad", 5 to "Terrible")

fun severityDisplay(level: Int): String =
    severityLabels[level]?.let { "$level/5 - $it" } ?: "$level/5"

@Composable
fun SeverityRating(value: Int, onChange: (Int) -> Unit, modifier: Modifier = Modifier) {
    Column(modifier = modifier) {
        Text("Severity:", fontSize = 11.sp, color = Color.DarkGray)
        Row(modifier = Modifier.padding(top = 2.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            for (level in 1..5) {
                val selected = value == level
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .background(
                                if (selected) severityColor(level) else Color.Transparent,
                                shape = MaterialTheme.shapes.small
                            )
                            .border(
                                width = 1.dp,
                                color = if (selected) severityColor(level) else Color.LightGray,
                                shape = MaterialTheme.shapes.small
                            )
                            .clickable { onChange(if (selected) 0 else level) },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = level.toString(),
                            fontSize = 12.sp,
                            color = if (selected) Color.White else Color.DarkGray
                        )
                    }
                    Text(
                        text = severityLabels[level] ?: "",
                        fontSize = 8.sp,
                        color = Color.DarkGray,
                        modifier = Modifier.width(32.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

