import { StudentPinSchedule } from '../types';

export interface ScheduleStatusResult {
  isActive: boolean;
  status: 'ALWAYS_ACTIVE' | 'SCHEDULED_ACTIVE' | 'SCHEDULED_INACTIVE' | 'SCHEDULED_UPCOMING' | 'SCHEDULED_EXPIRED';
  reason?: string;
  formattedWindow?: string;
}

export function isStudentPinActive(schedule?: StudentPinSchedule): ScheduleStatusResult {
  if (!schedule || !schedule.isEnabled) {
    return {
      isActive: true,
      status: 'ALWAYS_ACTIVE',
      formattedWindow: 'Always Active (24/7 Access)'
    };
  }

  const now = new Date();

  if (schedule.type === 'daily') {
    if (!schedule.startTime || !schedule.endTime) {
      return {
        isActive: true,
        status: 'ALWAYS_ACTIVE',
        formattedWindow: 'Daily (No time set)'
      };
    }

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    const startMinutes = (startH || 0) * 60 + (startM || 0);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    const formatTime12 = (time24: string) => {
      if (!time24) return '';
      const [h, m] = time24.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m < 10 ? '0' : ''}${m} ${ampm}`;
    };

    const formattedStart = formatTime12(schedule.startTime);
    const formattedEnd = formatTime12(schedule.endTime);
    const formattedWindow = `Daily from ${formattedStart} to ${formattedEnd}`;

    let active = false;
    if (startMinutes <= endMinutes) {
      active = currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      active = currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    if (active) {
      return {
        isActive: true,
        status: 'SCHEDULED_ACTIVE',
        formattedWindow
      };
    } else {
      return {
        isActive: false,
        status: 'SCHEDULED_INACTIVE',
        reason: `Student Access PIN is scheduled to be active only between ${formattedStart} and ${formattedEnd} daily.`,
        formattedWindow
      };
    }
  } else {
    // Specific datetime window
    if (!schedule.startTime && !schedule.endTime) {
      return {
        isActive: true,
        status: 'ALWAYS_ACTIVE',
        formattedWindow: 'Datetime Schedule (Unspecified range)'
      };
    }

    const start = schedule.startTime ? new Date(schedule.startTime) : null;
    const end = schedule.endTime ? new Date(schedule.endTime) : null;

    const formatDateTime = (d: Date | null) => {
      if (!d || isNaN(d.getTime())) return 'Unspecified';
      return d.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    };

    const formattedStart = formatDateTime(start);
    const formattedEnd = formatDateTime(end);
    const formattedWindow = `${formattedStart} to ${formattedEnd}`;

    if (start && !isNaN(start.getTime()) && now < start) {
      return {
        isActive: false,
        status: 'SCHEDULED_UPCOMING',
        reason: `Student Access PIN schedule has not started yet. Active starting from ${formattedStart}.`,
        formattedWindow
      };
    }

    if (end && !isNaN(end.getTime()) && now > end) {
      return {
        isActive: false,
        status: 'SCHEDULED_EXPIRED',
        reason: `Student Access PIN schedule expired at ${formattedEnd}.`,
        formattedWindow
      };
    }

    return {
      isActive: true,
      status: 'SCHEDULED_ACTIVE',
      formattedWindow
    };
  }
}
