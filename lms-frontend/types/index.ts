import { ReactNode } from "react";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: { roleName: string };
  profileImage: string;
  timezone: string;
  timeSlot: string;
  subjects: string[];
  createdAt: string;
  isFirstLogin?: boolean;
  isTimezoneSet?: boolean;
}

export interface Teacher {
  _id: string;
  name: string;
  email: string;
  subjects: string[];
}

export interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: { roleName: string } | null;
  subjects: string[];
  teacherId?: string | null;
}

export interface RawUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: { _id: string } | null | string;
  profileImage?: string;
  timezone?: string;
  preferredTimeSlots?: string[];
  subjects?: string[];
  joinDate?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  employeeId?: string;
  studentId?: string | null;
  teacherId?: string | null;
  gender?: string;
  isTimezoneSet?: boolean;
  address?: string;
  isFirstLogin?: boolean;
  profile?: {
    bio?: string;
    hobbies?: string[];
    skills?: string[];
    about?: string;
    accomplishments?: string[];
    qualifications?: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  type: "email" | "phone";
  fullPhone?: string;
  error?: string;
}

export interface AssignRoleState {
  users: User[];
  selections: { [userId: string]: UserSelections };
  loading: boolean;
  fetchLoading: boolean;
  isDropdownScrolling: boolean;
}

export interface UserSelections {
  selectedRole: string;
  selectedSubjects: string[];
  selectedTeacherId: string;
  teachers: User[];
  errors: { [key: string]: string };
  isRolePopoverOpen: boolean;
  loading: boolean;
}

export interface ApiUserResponse {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  role: { roleName: string };
  profileImage: string;
  subjects: string[];
  timezone: string;
  isTimezoneSet: boolean;
  address: string;
  joinDate: string;
  studentId: string | null;
  employeeId: string | null;
  isFirstLogin: boolean;
  preferredTimeSlots: string[];
  profile: {
    bio: string;
    hobbies: string[];
    skills: string[];
    about: string;
    accomplishments: string[];
    qualifications: string[];
    enrollmentStatus: "Active" | "Inactive";
    experience: { title: string; institution: string; duration: string }[];
  };
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}


export interface Notification {
  _id: string;
  userId?: string;
  message: string;
  read?: boolean;
  createdAt: string;
  updatedAt?: string;
  __v: number;
  link?: string;
}

export interface StudentLayoutProps {
  children: ReactNode;
}

export interface TeacherLayoutProps {
  children: ReactNode;
}

export interface ScheduleCallState {
  selectedTeacherId: string;
  selectedStudentIds: string[];
  selectedCallId: string;
  documents: File[];
  teachers: Teacher[];
  students: Student[];
  scheduledCalls: ScheduledCall[];
  loading: boolean;
  showForm: boolean;
  showRescheduleForm: boolean;
  formLoading: boolean;
  isModalScrolling: boolean;
  isDropdownScrolling: boolean;
  isClassTypePopoverOpen: boolean;
  isTypePopoverOpen: boolean;
  isTimeSlotPopoverOpen: boolean;
  isDatePickerOpen: boolean;
  isRescheduleDatePickerOpen: boolean;
showCancelConfirm:boolean;
cancelCallId: string;
showScheduledCalls: boolean;
showTeachers:boolean;
openCards: { [key: string]: boolean }; 
selectedDocument: { topic: string; documentUrl: string; documentType: string; zoomLink?: string; passcode?: string } | null; 
isScrolling: boolean;
callView:"all" | "upcoming" | "today" | "week" | "completed" | "cancelled";
}

export interface ScheduledCall {
  _id: string;
  teacherId: Teacher;
  teacher: Teacher; 
  studentIds: Student[];
  classType: string;
classSubType?: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingId?: string;
  zoomLink: string;
  passcode: string;
  documents: { name: string; url: string; fileId: string }[];
   status: "Scheduled" | "Rescheduled" | "Completed" | "Cancelled";
scheduledBy: { _id: string; name: string; email: string; roleName: string };  timezone: string;
  isRescheduled: boolean;
}

export interface DemoScheduleCallState {
  selectedTeacherId: string;
  selectedStudentIds: string[];
  selectedCallId: string;
  documents: File[];
  teachers: Teacher[];
  students: Student[];
  scheduledCalls: DemoScheduledCall[];
  loading: boolean;
  showForm: boolean;
  showRescheduleForm: boolean;
  formLoading: boolean;
  isModalScrolling: boolean;
  isDropdownScrolling: boolean;
  isClassTypePopoverOpen: boolean;
  isTimeSlotPopoverOpen: boolean;
  isDatePickerOpen: boolean;
  isRescheduleDatePickerOpen: boolean;
showCancelConfirm:boolean;
cancelCallId: string;
showScheduledCalls: boolean;
showTeachers:boolean;
openCards: { [key: string]: boolean }; 
selectedDocument: { topic: string; documentUrl: string; documentType: string; zoomLink?: string; passcode?: string } | null; 
isScrolling: boolean;
callView:"all" | "upcoming" | "today" | "week" | "completed" | "cancelled";
}

export interface DemoScheduledCall {
  _id: string;
  assignedTeacher?: {
    _id: string;
    name: string;
    email: string;
  };
  classType: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  callDuration: number;
  timezone: string;
  zoomLink?: string;
  meetingId?: string;
  passcode?: string | null;
  status: "Scheduled" | "Rescheduled" | "Completed" | "Cancelled";
  studentEmails: string[];
  notificationSent: string[];
  previousDate?: string | null;
  previousStartTime?: string | null;
  previousEndTime?: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  documents?: { url: string; name?: string }[];
}

export interface TeacherDemoScheduleCallState {
  selectedStudentIds: string[];
  selectedCallId: string;
  documents: File[];
  students: Student[];
  scheduledCalls: TeacherDemoScheduleCall[];
  loading: boolean;
  showScheduleForm: boolean;
  showRescheduleForm: boolean;
  formLoading: boolean;
  isModalScrolling: boolean;
  isDropdownScrolling: boolean;
  isClassTypePopoverOpen: boolean;
  isTimeSlotPopoverOpen: boolean;
  isDatePickerOpen: boolean;
  isRescheduleDatePickerOpen: boolean;
showCancelConfirm:boolean;
cancelCallId: string;
showScheduledCalls: boolean;
openCards: { [key: string]: boolean }; 
selectedDocument: { topic: string; documentUrl: string; documentType: string; zoomLink?: string; passcode?: string } | null; 
isScrolling: boolean;
callView:"all" | "upcoming" | "today" | "week" | "completed" | "cancelled";
}

export interface TeacherDemoScheduleCall {
  _id: string;
  assignedTeacher?: {
    _id: string;
    name: string;
    email: string;
  };
  classType: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  callDuration: number;
  timezone: string;
  zoomLink?: string;
  meetingId?: string;
  passcode?: string | null;
  status: "Scheduled" | "Rescheduled" | "Completed" | "Cancelled";
  studentEmails: string[];
  notificationSent: string[];
  previousDate?: string | null;
  previousStartTime?: string | null;
  previousEndTime?: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  documents?: { url: string; name?: string }[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  slot: string;
  startTime24:string;
  endTime24:string;
}

export interface UserDetails {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  role?: { roleName: string };
  profileImage?: string;
  subjects?: string[];
  timezone?: string;
  preferredTimeSlots?: string[];
  address?: string;
  joinDate?:string;
  studentId?: string;
  employeeId?: string;
  isFirstLogin?: boolean;
   teacherId?: string;
  students?: string[];
  profile: Profile;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  [key: string]: string | string[] | { roleName: string } | Profile | boolean | undefined; 
}

export interface Profile {
  bio?: string;
  hobbies?: string[];
  skills?: string[];
  about?: string;
  accomplishments?: string[];
  qualifications?: string[];
  enrollmentStatus?: "Active" | "Inactive";
  academicYear?: string;
  experience: { title: string; institution: string; duration: string }[];
  [key: string]: string | string[] | { title: string; institution: string; duration: string }[] | undefined;
}

export interface ApiError extends Error {
  response?: {
    status?: number;
    data?: {
      errors?: { msg: string }[];
      message?: string;
    };
  };
}

export interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  loading: boolean;
  deviceId: string;
}

export interface ReportCard {
  _id: string;
  studentId: string;
  teacherId: string;
  rating: number;
  comments?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginState {
  identifier: string;
  countryCode: string;
  selectedCountry: string;
  isPhoneLogin: boolean;
  errors: {
    identifier: string;
    login: string;
  };
  loading: boolean;
  isLoggedIn: boolean;
  deviceId?: string;
}

export interface LayoutProps {
  children: ReactNode;
}

export interface SignupState {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  selectedCountry: string;
  gender: string;
  errors: {
    name?: string;
    email?: string;
    phone?: string;
    signup?: string;
    gender?: string;
  };
  loading: boolean;
  isLoggedIn: boolean;
  deviceId: string;
}

export interface OTPInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  verified?: boolean;
  disabled?: boolean;
  prefix?: string;
}

export interface RoleAssignmentProps {
  userId: string;
  isSuperAdmin?: boolean;
}

export interface ScheduledCall {
  teacherId: Teacher;
  _id: string;
  teacher: Teacher;
  studentIds: Student[];
  classType: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  meetingId?: string;
  zoomLink: string;
  passcode: string;
  documents: { name: string; url: string; fileId: string }[];
  status: "Scheduled" | "Rescheduled" | "Completed" | "Cancelled";
  scheduledBy:  { _id: string; name: string; email: string; roleName: string };
  timezone: string;
  isRescheduled: boolean;
  isOngoing?:boolean;
}

export interface CallLinkResponse {
  zoomLink: string;
  passcode: string;
  documents: { name: string; url: string; fileId: string }[];
  classType: string;
  type: string;
  timezone: string;
  date: string;
  startTime: string;
  endTime: string;
  teacher: { _id: string; name: string; email: string };
  scheduledBy?: { _id: string; name: string; email: string; roleName: string };
}

export interface Recording {
  _id: string;
  title: string;
  url: string;
  callId: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
}

export interface Document {
  createElement(arg0: string): unknown;
  body: unknown;
  name: string;
  url: string;
  fileId: string;
}

export interface CallLinks {
  zoomLink: string;
  passcode: string;
  meetingId: string;
  documents: Document[];
}


export interface DocumentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  documentUrl: string;
  documentType: string;
  zoomLink?: string;
  passcode?: string;
}
export interface VideoPlayerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
}

export interface CountryDropdownProps{
  value: string;
  onChange: (isoCode: string, dialCode: string) => void;
  slim?: boolean;
}


export interface UserContextType {
userDetails: UserDetails | null;
setUserDetails: (userDetails: UserDetails | null) => void;
loading: boolean;
}

export interface Ticket {
  ticketNumber: string;
  _id: string;
  issueType: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  visibleToTeacher: boolean;
  teacherId: string | null;
  userId: string;
  fileUrl?: string;
  user: User;
  teacher: Teacher;
  response: string | null;
  rating?: number;
}

export interface ErrorData {
  message?: string;
  errors?: { msg: string }[];
}

