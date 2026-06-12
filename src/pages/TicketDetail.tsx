import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Dialog,
  DialogContent,
  Avatar,
  CardActions,
  List,
  ListItem,
  ListItemAvatar
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import type { Ticket, Severity, Profile, Reply } from '../types';

interface CurrentProfile {
  profile: Profile | null;
}

const severityColors: Record<Severity, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'error',
};

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function TicketDetail({ profile }: CurrentProfile) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSeverity, setEditSeverity] = useState<Severity>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('');

  // Image state
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reply state
  const [replies, setReplies] = useState<Reply[]>([]);
  const [input, setInput] = useState("");
  const [category, setCategory] = useState("General");
  const listRef = useRef<HTMLUListElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // User state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchTicket();
    fetchProfiles();
    fetchUser();
    fetchReplies();

    // Subscribe to real-time changes for replies on this ticket
    const channel = supabase
      .channel("replies-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "replies",
          filter: `ticket_id=eq.${id}`,
        },
        (payload) => {
          const newReply = payload.new as Reply;
          setReplies((prev) => [...prev, newReply]);
        }
      )
      .subscribe();

    // Cleanup subscription when component unmounts or id changes
    return () => {
      supabase.removeChannel(channel);
    };

  }, [id]);

  const fetchTicket = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        creator:profiles!tickets_created_by_fkey(id, username),
        assignee:profiles!tickets_assigned_to_fkey(id, username)
      `)
      .eq('id', id)
      .single();

    if (error) {
      setError('Ticket not found');
    } else {
      setTicket(data);
      setEditTitle(data.title);
      setEditDescription(data.description);
      setEditSeverity(data.severity);
      setAssignedTo(data.assigned_to || '');
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, role, created_at") // include created_at
      .eq("role", "technician");

    if (!error && data) {
      setProfiles(data as Profile[]); // now matches Profile
    }
  };


  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from("replies")
      .select("id, ticket_id, author_id, message, created_at, author:profiles(*), category")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      const mapped: Reply[] = data.map((r) => ({
        id: r.id,
        ticket_id: r.ticket_id,
        author_id: r.author_id,
        message: r.message,
        created_at: r.created_at,
        author: Array.isArray(r.author) ? r.author[0] : r.author, // 👈 handle both cases
        category: r.category
      }));

      setReplies(mapped);
    }
    else {
      console.error("Error fetching replies:", error);
      return;
    }
  };

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id ?? null);
  };



  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    setError(null);
    setNewImageFile(file);
    setRemoveCurrentImage(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewImageFile(null);
    setNewImagePreview(null);
    setRemoveCurrentImage(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!newImageFile || !ticket) return null;

    const fileExt = newImageFile.name.split('.').pop();
    const fileName = `${ticket.id}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('ticket-images')
      .upload(fileName, newImageFile);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      setError(`Failed to upload image: ${uploadError.message}`);
      return null;
    }

    const { data } = supabase.storage
      .from('ticket-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!ticket) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Keep existing image_url unless changed
    let imageUrl: string | null = ticket.image_url ?? null;

    // Handle image upload or removal
    if (newImageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) {
        imageUrl = uploadedUrl;
      }
    } else if (removeCurrentImage) {
      imageUrl = null;
    }

    // Build update object - only include image_url if it changed
    const updateData: Record<string, unknown> = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      severity: editSeverity,
      assigned_to: assignedTo || null,
      updated_at: new Date().toISOString(),
    };

    // Only update image_url if there was a change (new upload or explicit removal)
    if (newImageFile || removeCurrentImage) {
      updateData.image_url = imageUrl;
    }

    const { error: updateError } = await supabase
      .from('tickets')
      .update(updateData)
      .eq('id', ticket.id);

    if (updateError) {
      setError('Failed to update ticket: ' + updateError.message);
    } else {
      setSuccess('Ticket updated successfully');
      setEditing(false);
      setNewImageFile(null);
      setNewImagePreview(null);
      setRemoveCurrentImage(false);
      fetchTicket();
    }
    setSaving(false);
  };

  const handleAssign = async (userId: string) => {
    if (!ticket) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        assigned_to: userId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (updateError) {
      setError('Failed to assign ticket: ' + updateError.message);
    } else {
      setSuccess('Ticket assigned successfully');
      setAssignedTo(userId);
      fetchTicket();
    }
    setSaving(false);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditTitle(ticket?.title || '');
    setEditDescription(ticket?.description || '');
    setEditSeverity(ticket?.severity || 'medium');
    setNewImageFile(null);
    setNewImagePreview(null);
    setRemoveCurrentImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddReply = async () => {
    if (!input.trim() || !currentUserId || !ticket) return;

    const { data, error } = await supabase
      .from("replies")
      .insert([
        {
          ticket_id: ticket.id,
          author_id: currentUserId,
          message: input,
          category: category,
        },
      ])
      .select("id, ticket_id, author_id, message, created_at, author:profiles(id, username, role, created_at), category")
      .single();

    if (error) {
      console.error("Error saving reply:", error);
      return;
    }

    const newReply: Reply = {
      id: data.id,
      ticket_id: data.ticket_id,
      author_id: data.author_id,
      message: data.message,
      created_at: data.created_at,
      author: Array.isArray(data.author) ? data.author[0] : data.author, // 👈 flatten array to single Profile
      category: data.category,
    };

    setReplies([...replies, newReply]);
    setInput("");

    // Scroll to bottom
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box>
        <Alert severity="error">Ticket not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  const currentImageUrl = removeCurrentImage ? null : (newImagePreview || ticket.image_url);

  const getAssignedLabel = (ticket: Ticket) => {
    if (!ticket.assigned_to) return "Not yet assigned";
    const user = profiles.find((p) => p.id === ticket.assigned_to);
    return `Assign to ${user?.username ?? ticket.assigned_to}`;
  };


  return (
    <Box>
      {profile?.role === "customer" ? (
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
      ) : (
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tech')} sx={{ mb: 2 }}>
          Back to Dashboard
        </Button>
      )}

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

      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="caption" color="textSecondary">
                Ticket Number
              </Typography>
              <Typography variant="h6" fontFamily="monospace">
                {ticket.ticket_number}
              </Typography>
            </Box>
            {!editing && (
              <Button
                startIcon={<EditIcon />}
                variant="outlined"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {editing ? (
            <Box>
              <TextField
                fullWidth
                label="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                margin="normal"
              />

              <TextField
                fullWidth
                label="Description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                margin="normal"
                multiline
                rows={4}
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={editSeverity}
                  label="Severity"
                  onChange={(e) => setEditSeverity(e.target.value as Severity)}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>

              {/* Image Upload Section in Edit Mode */}
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Attachment
                </Typography>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageSelect}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  id="image-upload-edit"
                />
                {!currentImageUrl ? (
                  <label htmlFor="image-upload-edit">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      fullWidth
                      sx={{ py: 2 }}
                    >
                      Upload Image (JPG, PNG, GIF, WebP - Max 5MB)
                    </Button>
                  </label>
                ) : (
                  <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                    <Box
                      component="img"
                      src={currentImageUrl}
                      alt="Preview"
                      sx={{
                        width: '100%',
                        maxHeight: 300,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    />
                    <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
                      <label htmlFor="image-upload-edit">
                        <IconButton
                          component="span"
                          sx={{
                            bgcolor: 'background.paper',
                            '&:hover': { bgcolor: 'primary.light', color: 'white' },
                          }}
                          size="small"
                        >
                          <CloudUploadIcon />
                        </IconButton>
                      </label>
                      <IconButton
                        onClick={handleRemoveImage}
                        sx={{
                          bgcolor: 'background.paper',
                          '&:hover': { bgcolor: 'error.light', color: 'white' },
                        }}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                )}
              </Box>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  startIcon={<SaveIcon />}
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  variant="outlined"
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          ) : (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="textSecondary">
                  Title
                </Typography>
                <Typography variant="h5">{ticket.title}</Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="textSecondary">
                  Description
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {ticket.description}
                </Typography>
              </Grid>

              {/* Display Image if exists */}
              {ticket.image_url && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                    Attachment
                  </Typography>
                  <Box
                    sx={{
                      position: 'relative',
                      display: 'block',
                      width: 'fit-content',
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.9,
                      },
                    }}
                    onClick={() => setImageDialogOpen(true)}
                  >
                    <Box
                      component="img"
                      src={ticket.image_url}
                      alt="Ticket attachment"
                      sx={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: 400,
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'grey.50',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        bgcolor: 'rgba(255,255,255,0.9)',
                        borderRadius: 1,
                        px: 1,
                        py: 0.5,
                      }}
                    >
                      <ZoomInIcon fontSize="small" />
                      <Typography variant="caption">Click to enlarge</Typography>
                    </Box>
                  </Box>
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Severity
                </Typography>
                <Box mt={0.5}>
                  <Chip
                    label={ticket.severity.toUpperCase()}
                    color={severityColors[ticket.severity]}
                  />
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Status
                </Typography>
                <Box mt={0.5}>
                  <Chip
                    label={ticket.status.replace('_', ' ').toUpperCase()}
                    color={
                      ticket.status === 'pending'
                        ? 'default'
                        : ticket.status === 'in_progress'
                          ? 'primary'
                          : 'success'
                    }
                  />
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Created By
                </Typography>
                <Typography variant="body1">
                  {ticket.creator?.username || 'Unknown'}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Typography variant="caption" color="textSecondary">
                  Created At
                </Typography>
                <Typography variant="body1">
                  {new Date(ticket.created_at).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}

          <Divider sx={{ my: 3 }} />
          {profile?.role === "customer" ? (
            <>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Assignment
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{getAssignedLabel(ticket)}</InputLabel>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </>
          ) : (
            <>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Assignment
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Assign To</InputLabel>
                      <Select
                        value={assignedTo}
                        label="Assign To"
                        onChange={(e) => handleAssign(e.target.value)}
                        disabled={saving}
                      >
                        <MenuItem value="">
                          <em>Unassigned</em>
                        </MenuItem>
                        {profiles.map((profile) => (
                          <MenuItem key={profile.id} value={profile.id}>
                            {profile.username}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  {ticket.assignee && (
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Button
                        variant="outlined"
                        onClick={() => navigate('/tech/tickets/assigned')}
                      >
                        View Assigned Tickets
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </>
          )
          }

        </CardContent >
      </Card >

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h6">
                Replies
              </Typography>
            </Box>
          </Box>
          {/* Replies List */}
          <List sx={{ mb: 2, maxHeight: 300, overflowY: "auto" }} ref={listRef}>
            {replies
              .filter((reply) => {
                // Show Internal replies only to technicians
                if (reply.category === "Internal" && profile?.role !== "technician") {
                  return false;
                }
                return true; // General replies are always visible
              })
              .map((reply) => {
                const isOwnReply = reply.author_id === currentUserId;

                return (
                  <ListItem
                    key={reply.id}
                    sx={{
                      justifyContent: isOwnReply ? "flex-end" : "flex-start",
                      display: "flex",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: isOwnReply ? "row-reverse" : "row",
                        alignItems: "flex-start",
                        width: "100%",
                        gap: 1.5,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar>{reply.author?.username?.charAt(0) ?? "?"}</Avatar>
                      </ListItemAvatar>

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isOwnReply ? "flex-end" : "flex-start",
                          width: "100%",
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: isOwnReply ? "#e0f7fa" : "#f5f5f5",
                            borderRadius: 2,
                            p: 1,
                            maxWidth: "80%",
                            textAlign: isOwnReply ? "right" : "left",
                          }}
                        >
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: 600,
                              color: isOwnReply ? "primary.main" : "text.secondary",
                              mb: 0.5,
                            }}
                          >
                            {reply.author?.username ?? "Unknown"}

                          </Typography>
                          {profile?.role == "technician" && (
                            <Typography
                              variant="caption"
                              sx={{
                                fontStyle: "italic",
                                color: reply.category === "Internal" ? "error.main" : "success.main",
                              }}
                            >
                              {reply.category}
                            </Typography>
                          )}
                          <Typography variant="body2">{reply.message}</Typography>

                          <Typography variant="caption" color="text.secondary">
                            {new Date(reply.created_at).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </ListItem>
                );
              })}
            <div ref={bottomRef} /> {/* marker at the end */}
          </List>
        </CardContent>



        {/* Input Box at the Bottom */}
        <CardActions>
          <Box display="flex" gap={2} width="100%">
            <TextField
              fullWidth
              label="Write a reply..."
              variant="outlined"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault(); // prevent newline
                  handleAddReply();
                }
              }}
            />
            {profile?.role == "technician" && (
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel id="category-label">Category</InputLabel>
                <Select
                  labelId="category-label"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <MenuItem value="General">General</MenuItem>
                  <MenuItem value="Internal">Internal</MenuItem>
                </Select>
              </FormControl>
            )}

            <Button variant="contained" onClick={handleAddReply}>
              Reply
            </Button>
          </Box>
        </CardActions>
      </Card>


      {/* Full-size Image Dialog */}
      <Dialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        maxWidth="lg"
      >
        <DialogContent sx={{ p: 1 }}>
          {ticket.image_url && (
            <Box
              component="img"
              src={ticket.image_url}
              alt="Ticket attachment"
              sx={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box >
  );
}
