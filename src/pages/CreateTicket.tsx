import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  IconButton,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { supabase } from '../lib/supabase';
import type { Severity, Profile } from '../types';

interface CreateTicketProps {
  profile: Profile | null;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function CreateTicket({ profile }: CreateTicketProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const generateTicketNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    const username = profile?.username || 'USER';
    return `${year}${month}${day}_${username.toUpperCase()}_${random}`;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size too large. Maximum size is 5MB.');
      return;
    }

    setError(null);
    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (ticketId: string): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${ticketId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('ticket-images')
      .upload(fileName, imageFile);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      setLoading(false);
      return;
    }

    if (!description.trim()) {
      setError('Description is required');
      setLoading(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError('You must be logged in to create a ticket');
      setLoading(false);
      return;
    }

    const ticketNumber = generateTicketNumber();

    // First create the ticket without image
    const { data, error: insertError } = await supabase
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        title: title.trim(),
        description: description.trim(),
        severity,
        status: 'pending',
        created_by: userData.user.id,
      })
      .select()
      .single();

    if (insertError) {
      setError('Failed to create ticket: ' + insertError.message);
      setLoading(false);
      return;
    }

    // Upload image if selected
    if (imageFile && data) {
      const imageUrl = await uploadImage(data.id);
      if (imageUrl) {
        await supabase
          .from('tickets')
          .update({ image_url: imageUrl })
          .eq('id', data.id);
      }
    }

    if (profile?.role === "customer") {
      navigate(`/tickets/${data.id}`);
    } else {
      navigate(`/tech/tickets/${data.id}`);
    }
  };

  return (
    <Box maxWidth={600} mx="auto">
      <Typography variant="h4" gutterBottom>
        Create New Ticket
      </Typography>

      <Card>
        <CardContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              margin="normal"
              required
              placeholder="Brief summary of the issue"
            />

            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              required
              multiline
              rows={4}
              placeholder="Detailed description of the issue"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel>Severity</InputLabel>
              <Select
                value={severity}
                label="Severity"
                onChange={(e) => setSeverity(e.target.value as Severity)}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>

            {/* Image Upload Section */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Attachment (Optional)
              </Typography>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                ref={fileInputRef}
                style={{ display: 'none' }}
                id="image-upload"
              />
              {!imagePreview ? (
                <label htmlFor="image-upload">
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
                    src={imagePreview}
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
                  <IconButton
                    onClick={handleRemoveImage}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: 'background.paper',
                      '&:hover': { bgcolor: 'error.light', color: 'white' },
                    }}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    {imageFile?.name}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                fullWidth
              >
                {loading ? 'Creating...' : 'Create Ticket'}
              </Button>
              {profile?.role === "customer" ? (<Button
                variant="outlined"
                onClick={() => navigate('/')}
                fullWidth
              >
                Cancel
              </Button>) : (<Button
                variant="outlined"
                onClick={() => navigate('/tech')}
                fullWidth
              >
                Cancel
              </Button>)}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
