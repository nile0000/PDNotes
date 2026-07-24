import type { Appointment, Contact, DayStatus, DaySymptoms, MedicationSchedule } from "@pd-notes/shared";
import { create } from "zustand";
import { appointmentsApi } from "../api/resources/appointments";
import { contactsApi } from "../api/resources/contacts";
import { dayStatusesApi } from "../api/resources/dayStatuses";
import { daySymptomsApi } from "../api/resources/daySymptoms";
import { medicationSchedulesApi } from "../api/resources/medicationSchedules";
import { syncApi } from "../api/resources/sync";

const DEBOUNCE_MS = 500;

function emptyDayStatus(date: string): DayStatus {
  return { date, rating: "NORMAL", note: "", exercise: "", isRead: false };
}

function emptyDaySymptoms(date: string): DaySymptoms {
  return {
    date,
    tremors: "",
    tremorsSeverity: 0,
    legs: "",
    legsSeverity: 0,
    plumbing: "",
    plumbingSeverity: 0,
    neuropathy: "",
    neuropathySeverity: 0,
    sleep: "",
    sleepSeverity: 0,
    diet: "",
    dietSeverity: 0,
    pain: "",
    painSeverity: 0,
  };
}

interface AppState {
  isLoaded: boolean;
  isSyncing: boolean;
  lastError: string | null;

  medicationSchedules: MedicationSchedule[];
  dayStatuses: Record<string, DayStatus>;
  daySymptoms: Record<string, DaySymptoms>;
  appointments: Appointment[];
  contacts: Contact[];

  loadSync: () => Promise<void>;
  reset: () => void;
  clearError: () => void;

  addOrUpdateSchedule: (schedule: MedicationSchedule) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;

  addOrUpdateAppointment: (appointment: Appointment) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;

  addOrUpdateContact: (contact: Contact) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;

  updateStatus: (date: string, mutate: (status: DayStatus) => DayStatus) => void;
  updateSymptoms: (date: string, mutate: (symptoms: DaySymptoms) => DaySymptoms) => void;
  markAllNotesRead: () => Promise<void>;
}

const statusTimers = new Map<string, ReturnType<typeof setTimeout>>();
const symptomsTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useAppStore = create<AppState>((set, get) => ({
  isLoaded: false,
  isSyncing: false,
  lastError: null,

  medicationSchedules: [],
  dayStatuses: {},
  daySymptoms: {},
  appointments: [],
  contacts: [],

  loadSync: async () => {
    set({ isSyncing: true, lastError: null });
    try {
      const data = await syncApi.fetch();
      const dayStatuses: Record<string, DayStatus> = {};
      for (const status of data.dayStatuses) dayStatuses[status.date] = status;
      const daySymptoms: Record<string, DaySymptoms> = {};
      for (const symptoms of data.daySymptoms) daySymptoms[symptoms.date] = symptoms;

      set({
        medicationSchedules: data.medicationSchedules,
        dayStatuses,
        daySymptoms,
        appointments: data.appointments,
        contacts: data.contacts,
        isLoaded: true,
        isSyncing: false,
      });
    } catch (err) {
      set({ isSyncing: false, lastError: err instanceof Error ? err.message : "Sync failed" });
    }
  },

  clearError: () => set({ lastError: null }),

  reset: () => {
    statusTimers.forEach((timer) => clearTimeout(timer));
    symptomsTimers.forEach((timer) => clearTimeout(timer));
    statusTimers.clear();
    symptomsTimers.clear();
    set({
      isLoaded: false,
      medicationSchedules: [],
      dayStatuses: {},
      daySymptoms: {},
      appointments: [],
      contacts: [],
    });
  },

  addOrUpdateSchedule: async (schedule) => {
    const previous = get().medicationSchedules;
    const exists = previous.some((s) => s.id === schedule.id);
    set({
      medicationSchedules: exists
        ? previous.map((s) => (s.id === schedule.id ? schedule : s))
        : [...previous, schedule],
    });
    try {
      const saved = exists
        ? await medicationSchedulesApi.update(schedule.id, schedule)
        : await medicationSchedulesApi.create(schedule);
      set((state) => ({
        medicationSchedules: state.medicationSchedules.map((s) =>
          s.id === saved.id ? saved : s
        ),
      }));
    } catch (err) {
      set({ medicationSchedules: previous, lastError: err instanceof Error ? err.message : "Save failed" });
      throw err;
    }
  },

  deleteSchedule: async (id) => {
    const previous = get().medicationSchedules;
    set({ medicationSchedules: previous.filter((s) => s.id !== id) });
    try {
      await medicationSchedulesApi.remove(id);
    } catch (err) {
      set({ medicationSchedules: previous, lastError: err instanceof Error ? err.message : "Delete failed" });
      throw err;
    }
  },

  addOrUpdateAppointment: async (appointment) => {
    const previous = get().appointments;
    const exists = previous.some((a) => a.id === appointment.id);
    set({
      appointments: exists
        ? previous.map((a) => (a.id === appointment.id ? appointment : a))
        : [...previous, appointment],
    });
    try {
      const saved = exists
        ? await appointmentsApi.update(appointment.id, appointment)
        : await appointmentsApi.create(appointment);
      set((state) => ({
        appointments: state.appointments.map((a) => (a.id === saved.id ? saved : a)),
      }));
    } catch (err) {
      set({ appointments: previous, lastError: err instanceof Error ? err.message : "Save failed" });
      throw err;
    }
  },

  deleteAppointment: async (id) => {
    const previous = get().appointments;
    set({ appointments: previous.filter((a) => a.id !== id) });
    try {
      await appointmentsApi.remove(id);
    } catch (err) {
      set({ appointments: previous, lastError: err instanceof Error ? err.message : "Delete failed" });
      throw err;
    }
  },

  addOrUpdateContact: async (contact) => {
    const previous = get().contacts;
    const exists = previous.some((c) => c.id === contact.id);
    set({
      contacts: exists
        ? previous.map((c) => (c.id === contact.id ? contact : c))
        : [...previous, contact],
    });
    try {
      const saved = exists
        ? await contactsApi.update(contact.id, contact)
        : await contactsApi.create(contact);
      set((state) => ({
        contacts: state.contacts.map((c) => (c.id === saved.id ? saved : c)),
      }));
    } catch (err) {
      set({ contacts: previous, lastError: err instanceof Error ? err.message : "Save failed" });
      throw err;
    }
  },

  deleteContact: async (id) => {
    const previous = get().contacts;
    set({ contacts: previous.filter((c) => c.id !== id) });
    try {
      await contactsApi.remove(id);
    } catch (err) {
      set({ contacts: previous, lastError: err instanceof Error ? err.message : "Delete failed" });
      throw err;
    }
  },

  updateStatus: (date, mutate) => {
    const current = get().dayStatuses[date] ?? emptyDayStatus(date);
    const updated = mutate(current);
    set((state) => ({ dayStatuses: { ...state.dayStatuses, [date]: updated } }));

    const existingTimer = statusTimers.get(date);
    if (existingTimer) clearTimeout(existingTimer);
    statusTimers.set(
      date,
      setTimeout(() => {
        statusTimers.delete(date);
        const { date: _date, ...body } = get().dayStatuses[date] ?? updated;
        dayStatusesApi.upsert(date, body).catch((err) => {
          set({ lastError: err instanceof Error ? err.message : "Save failed" });
        });
      }, DEBOUNCE_MS)
    );
  },

  updateSymptoms: (date, mutate) => {
    const current = get().daySymptoms[date] ?? emptyDaySymptoms(date);
    const updated = mutate(current);
    set((state) => ({ daySymptoms: { ...state.daySymptoms, [date]: updated } }));

    const existingTimer = symptomsTimers.get(date);
    if (existingTimer) clearTimeout(existingTimer);
    symptomsTimers.set(
      date,
      setTimeout(() => {
        symptomsTimers.delete(date);
        const { date: _date, ...body } = get().daySymptoms[date] ?? updated;
        daySymptomsApi.upsert(date, body).catch((err) => {
          set({ lastError: err instanceof Error ? err.message : "Save failed" });
        });
      }, DEBOUNCE_MS)
    );
  },

  markAllNotesRead: async () => {
    const previous = get().dayStatuses;
    const updates = Object.values(previous).filter((s) => !s.isRead && (s.note || s.exercise));
    set({
      dayStatuses: Object.fromEntries(
        Object.entries(previous).map(([date, status]) => [date, { ...status, isRead: true }])
      ),
    });
    try {
      await Promise.all(
        updates.map(({ date, ...body }) => dayStatusesApi.upsert(date, { ...body, isRead: true }))
      );
    } catch (err) {
      set({ dayStatuses: previous, lastError: err instanceof Error ? err.message : "Save failed" });
      throw err;
    }
  },
}));
