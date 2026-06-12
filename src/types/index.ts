export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type TicketStatus = 'pending' | 'in_progress' | 'closed';

export interface Profile {
  id: string;
  username: string;
  role?: "customer" | "technician"; // ✅ stricter typing
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  severity: Severity;
  status: TicketStatus;
  created_by: string;
  assigned_to: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string;
  // Joined fields
  creator?: Profile;
  assignee?: Profile;
}

export interface User {
  id: string;
  email: string;
}

export interface Reply {
  id: string;
  ticket_id: string;
  author_id: string;
  message: string;
  created_at: string;
  author?: Profile; // single Profile object
  category: string;
}
