import React, { useEffect, useState, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Grid, Collapse, IconButton, Box, Paper, Chip, useTheme, alpha, LinearProgress } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, AccessTime as TimeIcon, Groups as GroupsIcon, Event as EventIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import config from '../config';
import PageHeader from '../components/PageHeader';

const DayCard = memo(({ day, index, isExpanded, onExpand }) => {
  const theme = useTheme();
  return (
    <motion.div variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card
        onClick={onExpand}
        sx={{ 
          cursor: 'pointer', transition: 'all 0.3s ease', mx: 1,
          bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.08) : 'background.paper',
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12), transform: 'translateY(-2px)' },
        }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}> {/* Adjust padding for mobile */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            <EventIcon color="primary" sx={{ fontSize: { xs: 20, sm: 24 } }} />
            <Typography variant="h6" >
              {day.name}
            </Typography>
            <Chip label={`${day.times.length} Sessions`} size="small" color="primary" variant="outlined" sx={{ ml: 'auto' }} />
            <IconButton sx={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.3s', p: { xs: 0.5, sm: 1 } }}>
              <ExpandMoreIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}, (prev, next) => prev.isExpanded === next.isExpanded);

const TimeSlot = memo(({ time, isExpanded, onExpand, onStageSelect }) => {
  const theme = useTheme();
  return (
    <Paper elevation={2} sx={{ 
      borderRadius: 2, 
      overflow: 'hidden',
      transition: '0.3s',
      mx: { xs: 1, sm: 0 },
      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } 
    }}>
      <Box 
        onClick={onExpand} 
        sx={{ 
          p: { xs: 1.5, sm: 2 },
          cursor: 'pointer',
          bgcolor: alpha(theme.palette.primary.main, 0.08)
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon color="primary" sx={{ fontSize: { xs: 18, sm: 24 } }} />
          <Typography variant="h6" sx={{ flex: 1, fontSize: { xs: '0.9rem', sm: '1.25rem' } }}>
            {time.name}
          </Typography>
          <IconButton sx={{ 
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            transition: '0.3s',
            p: { xs: 0.5, sm: 1 }
          }}>
            <ExpandMoreIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
          </IconButton>
        </Box>
      </Box>
      <Collapse in={isExpanded}>
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
            <GroupsIcon color="primary" sx={{ fontSize: { xs: 18, sm: 24 } }} />
            <Typography sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
              Available Stages
            </Typography>
          </Box>
          <Grid container spacing={1}>
            {time.batches.map(stage => (
              <Grid item xs={12} key={stage}>
                <Card 
                  onClick={() => onStageSelect(stage)} 
                  sx={{ 
                    p: { xs: 1, sm: 1.5 },
                    cursor: 'pointer',
                    '&:hover': { 
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      transform: { xs: 'scale(0.98)', sm: 'translateX(8px)' }
                    }
                  }}
                >
                  <Typography sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                    {stage}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
});

function CoursesPage() {
  const [structure, setStructure] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [expandedDay, setExpandedDay] = useState(null);
  const mounted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    fetch(`${config.API_BASE_URL}/courses`)
      .then(res => res.json())
      .then(data => setStructure(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader 
        pageTitle="Select Session" 
        pageSubtitle="Navigate through day and time to select your stage" 
        breadcrumbs={['Sessions']} 
        sx={{ mb: 2 }}
      />

      {loading ? (
        <Box sx={{ width: '100%', px: 3, mb: 3 }}>
          <LinearProgress />
        </Box>
      ) : (
        <Grid container spacing={{ xs: 1, sm: 3 }} sx={{ width: {md: '80vw'} }}>
          {structure.map((day, dayIndex) => (
            <Grid item xs={12} key={day.name}>
              <DayCard day={day} index={dayIndex} isExpanded={expandedDay === dayIndex} onExpand={() => {
                setExpandedDay(expandedDay === dayIndex ? null : dayIndex);
                setExpanded({});
              }} />
              <Collapse in={expandedDay === dayIndex}>
                <Box sx={{ mt: 2, pl: { sm: 4 } }}>
                  <Grid container spacing={2}>
                    {day.times.map((time, timeIndex) => (
                      <Grid item xs={12} sm={6} md={4} key={time.name}>
                        <TimeSlot
                          time={time}
                          isExpanded={expanded[`${dayIndex}-${timeIndex}`]}
                          onExpand={() => setExpanded(prev => ({ ...prev, [`${dayIndex}-${timeIndex}`]: !prev[`${dayIndex}-${timeIndex}`] }))}
                          onStageSelect={(stage) => navigate(`/gallery/${btoa(`${day.name}/${time.name}/${stage}`)}`)}
                        />
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Collapse>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}

export default CoursesPage;
