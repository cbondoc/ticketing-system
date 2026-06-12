import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  DateRange as DateRangeIcon,
  CalendarMonth as CalendarMonthIcon,
  Event as EventIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import type { Ticket, Severity, TicketStatus, Profile } from '../types';

const severityColors: Record<Severity, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const statusColors: Record<TicketStatus, 'default' | 'primary' | 'success'> = {
  pending: 'default',
  in_progress: 'primary',
  closed: 'success',
};

interface AssignedTicketsProps {
  profile: Profile | null;
}

export default function AssignedTickets({ profile }: AssignedTicketsProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (profile) {
      fetchAssignedTickets();
    }
  }, [profile]);

  const fetchAssignedTickets = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, username),
        assignee:profiles!tickets_assigned_to_fkey(id, username)
      `)
      .eq('assigned_to', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      setError('Failed to load assigned tickets');
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    setUpdating(ticketId);

    const updates: Partial<Ticket> = { status: newStatus };

    if (newStatus === "closed") {
      updates.closed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", ticketId);

    if (error) {
      setError("Failed to update status");
    } else {
      setSuccess("Status updated successfully");
      fetchAssignedTickets(); // refresh tickets
    }

    setUpdating(null);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  function groupClosedTickets(tickets: Ticket[]) {
    const closedTickets = tickets.filter(t => t.status === "closed");

    const perDay: Record<string, number> = {};
    const perWeek: Record<string, number> = {};
    const perMonth: Record<string, number> = {};
    const perYear: Record<string, number> = {};

    closedTickets.forEach(ticket => {
      const date = new Date(ticket.closed_at); // fallback

      const dayKey = date.toISOString().split("T")[0];
      perDay[dayKey] = (perDay[dayKey] || 0) + 1;

      const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
      perWeek[weekKey] = (perWeek[weekKey] || 0) + 1;

      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      perMonth[monthKey] = (perMonth[monthKey] || 0) + 1;

      const yearKey = `${date.getFullYear()}`;
      perYear[yearKey] = (perYear[yearKey] || 0) + 1;
    });

    return { perDay, perWeek, perMonth, perYear };
  }

  function getWeekNumber(date: Date) {
    const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    return Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  const { perDay, perWeek, perMonth, perYear } = groupClosedTickets(tickets);

  const todayCount = perDay[new Date().toISOString().split("T")[0]] || 0;
  const weekCount = perWeek[`${new Date().getFullYear()}-W${getWeekNumber(new Date())}`] || 0;
  const monthCount = perMonth[`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`] || 0;
  const yearCount = perYear[`${new Date().getFullYear()}`] || 0;


  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        My Assigned Tickets
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Closed Today */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {todayCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Closed Today
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Closed This Week */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {weekCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Closed This Week
                  </Typography>
                </Box>
                <DateRangeIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Closed This Month */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {monthCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Closed This Month
                  </Typography>
                </Box>
                <CalendarMonthIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Closed This Year */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h3" fontWeight="bold">
                    {yearCount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Closed This Year
                  </Typography>
                </Box>
                <EventIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="textSecondary">
            You have <strong>{tickets.length}</strong> ticket(s) assigned to you.
            Change the status to track progress.
          </Typography>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Ticket #</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Change Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary" py={4}>
                    No tickets assigned to you
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id} hover>
                  <TableCell
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tech/tickets/${ticket.id}`)}
                  >
                    <Typography variant="body2" fontFamily="monospace" color="primary">
                      {ticket.ticket_number}
                    </Typography>
                  </TableCell>
                  <TableCell
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/tech/tickets/${ticket.id}`)}
                  >
                    {ticket.title}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.severity.toUpperCase()}
                      color={severityColors[ticket.severity]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ticket.status.replace('_', ' ').toUpperCase()}
                      color={statusColors[ticket.status]}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{ticket.creator?.username || 'Unknown'}</TableCell>
                  <TableCell>
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={ticket.status}
                        label="Status"
                        onChange={(e) =>
                          handleStatusChange(ticket.id, e.target.value as TicketStatus)
                        }
                        disabled={updating === ticket.id}
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="closed">Closed</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
