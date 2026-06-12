import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  Grid,
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
  Divider,
  TableSortLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  HourglassEmpty as PendingIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as ClosedIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  FiberManualRecord as LowIcon,
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

interface DashboardProps {
  profile: Profile | null;
}

interface TicketStats {
  total: number;
  totalExcludingClosed: number;
  byStatus: Record<TicketStatus, number>;
  bySeverity: Record<Severity, number>;
  myTickets: number;
  myTicketsExcludingClosed: number;
}

export default function Dashboard({ profile }: DashboardProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    totalExcludingClosed: 0,
    byStatus: { pending: 0, in_progress: 0, closed: 0 },
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    myTickets: 0,
    myTicketsExcludingClosed: 0,
  });
  const navigate = useNavigate();

  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState<keyof Ticket>('status');

  const handleRequestSort = (property: keyof Ticket) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  function descendingComparator<T>(a: T, b: T, orderBy: keyof T): number {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
  }

  function getComparator<Key extends keyof Ticket>(
    order: 'asc' | 'desc',
    orderBy: Key
  ): (a: Ticket, b: Ticket) => number {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  }

  function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number): T[] {
    const stabilized = array.map((el, index) => [el, index] as [T, number]);
    stabilized.sort((a, b) => {
      const cmp = comparator(a[0], b[0]);
      if (cmp !== 0) return cmp;
      return a[1] - b[1];
    });
    return stabilized.map((el) => el[0]);
  }

  useEffect(() => {
    fetchTickets();
  }, [profile]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, username),
        assignee:profiles!tickets_assigned_to_fkey(id, username)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
    } else {
      const ticketData = data || [];
      setTickets(ticketData);
      calculateStats(ticketData);
    }
    setLoading(false);
  };

  const calculateStats = (ticketData: Ticket[]) => {
    if (profile?.role === "technician") {
      const newStats: TicketStats = {
        total: ticketData.length,
        totalExcludingClosed: ticketData.filter(t => t.status !== 'closed').length,
        byStatus: { pending: 0, in_progress: 0, closed: 0 },
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        myTickets: 0,
        myTicketsExcludingClosed: 0,
      };

      ticketData.forEach(ticket => {
        // Count by status
        newStats.byStatus[ticket.status]++;

        // Count by severity (only non-closed tickets)
        if (ticket.status !== 'closed') {
          newStats.bySeverity[ticket.severity]++;
        }

        // Count my tickets (created by or assigned to current user)
        if (profile && (ticket.created_by === profile.id || ticket.assigned_to === profile.id)) {
          newStats.myTickets++;
          if (ticket.status !== 'closed') {
            newStats.myTicketsExcludingClosed++;
          }
        }
      });

      setStats(newStats);
    } else {
      const newStats: TicketStats = {
        total: 0,
        totalExcludingClosed: 0,
        byStatus: { pending: 0, in_progress: 0, closed: 0 },
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        myTickets: 0,
        myTicketsExcludingClosed: 0,
      };

      // ✅ Filter tickets for the current user first
      const userTickets = ticketData.filter(
        (t) => profile && (t.created_by === profile.id || t.assigned_to === profile.id)
      );

      newStats.total = userTickets.length;
      newStats.totalExcludingClosed = userTickets.filter((t) => t.status !== "closed").length;

      userTickets.forEach((ticket) => {
        // Count by status
        newStats.byStatus[ticket.status]++;

        // Count by severity (only non-closed tickets)
        if (ticket.status !== "closed") {
          newStats.bySeverity[ticket.severity]++;
        }

        // Count my tickets (redundant now, but kept for clarity)
        newStats.myTickets++;
        if (ticket.status !== "closed") {
          newStats.myTicketsExcludingClosed++;
        }
      });

      setStats(newStats);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    // ✅ Apply status filter
    if (statusFilter !== "all" && ticket.status !== statusFilter) return false;

    // ✅ Apply severity filter
    if (severityFilter !== "all" && ticket.severity !== severityFilter) return false;

    // ✅ Role-based filter
    if (profile?.role === "customer") {
      // Only tickets created by or assigned to this customer
      if (ticket.created_by !== profile.id && ticket.assigned_to !== profile.id) {
        return false;
      }
    }
    // If technician, no extra filter (they see all tickets that match status/severity)

    return true;
  });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Dashboard</Typography>
        {profile?.role === "customer" ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tickets/create')}
          >
            Create Ticket
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/tech/tickets/create')}
          >
            Create Ticket
          </Button>
        )}

      </Box>

      {profile?.role === "customer" ? (
        <>
          {/* Statistics Cards for Customers */}
          <Grid container spacing={2} sx={{ mb: 3 }}>

            {/* My Active Tickets Customers */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.myTicketsExcludingClosed}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        My Active Tickets
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Total All Time Customers */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" fontWeight="bold" color="text.primary">
                        {stats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total All Time
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Closed Tickets Customers */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.byStatus.closed}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Closed
                      </Typography>
                    </Box>
                    <ClosedIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Status Breakdown Customers */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Breakdown
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <PendingIcon color="action" />
                      <Typography variant="h4" fontWeight="bold">
                        {stats.byStatus.pending}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'primary.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <InProgressIcon color="primary" />
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {stats.byStatus.in_progress}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'success.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <ClosedIcon color="success" />
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {stats.byStatus.closed}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Closed
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Severity Breakdown (Active Tickets Only) Customers */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Severity Breakdown (Active Tickets)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <LowIcon sx={{ color: 'grey.500' }} />
                      <Typography variant="h4" fontWeight="bold">
                        {stats.bySeverity.low}
                      </Typography>
                    </Box>
                    <Chip label="LOW" size="small" />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'info.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <InfoIcon color="info" />
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {stats.bySeverity.medium}
                      </Typography>
                    </Box>
                    <Chip label="MEDIUM" size="small" color="info" />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'warning.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <WarningIcon color="warning" />
                      <Typography variant="h4" fontWeight="bold" color="warning.main">
                        {stats.bySeverity.high}
                      </Typography>
                    </Box>
                    <Chip label="HIGH" size="small" color="warning" />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'error.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <ErrorIcon color="error" />
                      <Typography variant="h4" fontWeight="bold" color="error.main">
                        {stats.bySeverity.critical}
                      </Typography>
                    </Box>
                    <Chip label="CRITICAL" size="small" color="error" />
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Typography variant="h5" gutterBottom>
            My Tickets
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="closed">Closed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={severityFilter}
                      label="Severity"
                      onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Severities</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === 'ticket_number' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'ticket_number'}
                      direction={orderBy === 'ticket_number' ? order : 'asc'}
                      onClick={() => handleRequestSort('ticket_number')}
                    >
                      Ticket #
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'title' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'title'}
                      direction={orderBy === 'title' ? order : 'asc'}
                      onClick={() => handleRequestSort('title')}
                    >
                      Title
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'severity' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'severity'}
                      direction={orderBy === 'severity' ? order : 'asc'}
                      onClick={() => handleRequestSort('severity')}
                    >
                      Severity
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'status' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'created_by' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'created_by'}
                      direction={orderBy === 'created_by' ? order : 'asc'}
                      onClick={() => handleRequestSort('created_by')}
                    >
                      Created By
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'assigned_to' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'assigned_to'}
                      direction={orderBy === 'assigned_to' ? order : 'asc'}
                      onClick={() => handleRequestSort('assigned_to')}
                    >
                      Assigned To
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'created_at' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'created_at'}
                      direction={orderBy === 'created_at' ? order : 'asc'}
                      onClick={() => handleRequestSort('created_at')}
                    >
                      Created At
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary" py={4}>
                        No tickets found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  stableSort(filteredTickets as Ticket[], getComparator(order, orderBy)).map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {ticket.ticket_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{ticket.title}</TableCell>
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
                      <TableCell>{ticket.assignee?.username || '-'}</TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : (
        <>
          {/* Statistics Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Total Active Tickets */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.totalExcludingClosed}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Active Tickets
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* My Active Tickets */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.myTicketsExcludingClosed}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        My Active Tickets
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Total All Time */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" fontWeight="bold" color="text.primary">
                        {stats.total}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total All Time
                      </Typography>
                    </Box>
                    <AssignmentIcon sx={{ fontSize: 48, color: 'action.disabled' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Closed Tickets */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="h3" fontWeight="bold">
                        {stats.byStatus.closed}
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Closed
                      </Typography>
                    </Box>
                    <ClosedIcon sx={{ fontSize: 48, opacity: 0.8 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Status Breakdown */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Breakdown
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <PendingIcon color="action" />
                      <Typography variant="h4" fontWeight="bold">
                        {stats.byStatus.pending}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'primary.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <InProgressIcon color="primary" />
                      <Typography variant="h4" fontWeight="bold" color="primary">
                        {stats.byStatus.in_progress}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
                    </Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'success.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <ClosedIcon color="success" />
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {stats.byStatus.closed}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Closed
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Severity Breakdown (Active Tickets Only) */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Severity Breakdown (Active Tickets)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <LowIcon sx={{ color: 'grey.500' }} />
                      <Typography variant="h4" fontWeight="bold">
                        {stats.bySeverity.low}
                      </Typography>
                    </Box>
                    <Chip label="LOW" size="small" />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'info.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <InfoIcon color="info" />
                      <Typography variant="h4" fontWeight="bold" color="info.main">
                        {stats.bySeverity.medium}
                      </Typography>
                    </Box>
                    <Chip label="MEDIUM" size="small" color="info" />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'warning.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <WarningIcon color="warning" />
                      <Typography variant="h4" fontWeight="bold" color="warning.main">
                        {stats.bySeverity.high}
                      </Typography>
                    </Box>
                    <Chip label="HIGH" size="small" color="warning" />
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderColor: 'error.main' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                      <ErrorIcon color="error" />
                      <Typography variant="h4" fontWeight="bold" color="error.main">
                        {stats.bySeverity.critical}
                      </Typography>
                    </Box>
                    <Chip label="CRITICAL" size="small" color="error" />
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Divider sx={{ my: 3 }} />

          {/* Filters */}
          <Typography variant="h5" gutterBottom>
            All Tickets
          </Typography>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Statuses</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="in_progress">In Progress</MenuItem>
                      <MenuItem value="closed">Closed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Severity</InputLabel>
                    <Select
                      value={severityFilter}
                      label="Severity"
                      onChange={(e) => setSeverityFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Severities</MenuItem>
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="medium">Medium</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === 'ticket_number' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'ticket_number'}
                      direction={orderBy === 'ticket_number' ? order : 'asc'}
                      onClick={() => handleRequestSort('ticket_number')}
                    >
                      Ticket #
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'title' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'title'}
                      direction={orderBy === 'title' ? order : 'asc'}
                      onClick={() => handleRequestSort('title')}
                    >
                      Title
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'severity' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'severity'}
                      direction={orderBy === 'severity' ? order : 'asc'}
                      onClick={() => handleRequestSort('severity')}
                    >
                      Severity
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'status' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'status'}
                      direction={orderBy === 'status' ? order : 'asc'}
                      onClick={() => handleRequestSort('status')}
                    >
                      Status
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'created_by' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'created_by'}
                      direction={orderBy === 'created_by' ? order : 'asc'}
                      onClick={() => handleRequestSort('created_by')}
                    >
                      Created By
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'assigned_to' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'assigned_to'}
                      direction={orderBy === 'assigned_to' ? order : 'asc'}
                      onClick={() => handleRequestSort('assigned_to')}
                    >
                      Assigned To
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={orderBy === 'created_at' ? order : false}>
                    <TableSortLabel
                      active={orderBy === 'created_at'}
                      direction={orderBy === 'created_at' ? order : 'asc'}
                      onClick={() => handleRequestSort('created_at')}
                    >
                      Created At
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="textSecondary" py={4}>
                        No tickets found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  stableSort(filteredTickets as Ticket[], getComparator(order, orderBy)).map((ticket) => (
                    <TableRow
                      key={ticket.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/tech/tickets/${ticket.id}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {ticket.ticket_number}
                        </Typography>
                      </TableCell>
                      <TableCell>{ticket.title}</TableCell>
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
                      <TableCell>{ticket.assignee?.username || '-'}</TableCell>
                      <TableCell>
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
