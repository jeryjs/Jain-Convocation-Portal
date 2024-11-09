import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  useTheme,
  alpha,
  Divider,
  Paper,
  Link
} from '@mui/material';
import {
  School as SchoolIcon,
  History as HistoryIcon,
  LocationOn as LocationIcon,
  EmojiEvents as AwardsIcon,
  Groups as CommunityIcon,
  Code as CodeIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';

function AboutPage() {
  const theme = useTheme();

  const features = [
    {
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      title: "Academic Excellence",
      description: "Committed to providing world-class education and fostering intellectual growth."
    },
    {
      icon: <HistoryIcon sx={{ fontSize: 40 }} />,
      title: "Rich Heritage",
      description: "Decades of academic excellence and tradition in shaping future leaders."
    },
    {
      icon: <LocationIcon sx={{ fontSize: 40 }} />,
      title: "Prime Location",
      description: "Strategically located campus with state-of-the-art facilities."
    },
    {
      icon: <AwardsIcon sx={{ fontSize: 40 }} />,
      title: "Achievements",
      description: "Recognized globally for outstanding contributions to education and research."
    },
    {
      icon: <CommunityIcon sx={{ fontSize: 40 }} />,
      title: "Vibrant Community",
      description: "Dynamic community of scholars, researchers, and industry leaders."
    }
  ];

  return (
    <>
      <PageHeader
        pageTitle="About Us"
        pageSubtitle="Discover Our Legacy of Excellence"
        breadcrumbs={['About']}
        sx={{ mb: 4 }}
      />

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Hero Section */}
          <Grid item xs={12}>
            <Paper
              component={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              elevation={3}
              sx={{
                p: 4,
                background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                color: 'white',
                borderRadius: 2,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
                Welcome to Jain University
              </Typography>
              <Typography variant="h6" sx={{ maxWidth: '800px', mb: 2, justifySelf:'center' }}>
                Empowering minds, shaping futures, and creating tomorrow's leaders through excellence in education.
              </Typography>
            </Paper>
          </Grid>

          {/* Features Grid */}
          <Grid item xs={12}>
            <Grid container spacing={3}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card
                    component={motion.div}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    sx={{
                      height: '100%',
                      transition: '0.3s',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: 6,
                        bgcolor: alpha(theme.palette.primary.main, 0.05)
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                      <IconButton
                        sx={{
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          mb: 2,
                          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) }
                        }}
                        size="large"
                      >
                        {feature.icon}
                      </IconButton>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Vision Section */}
          <Grid item xs={12}>
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              sx={{
                mt: 4,
                p: 4,
                bgcolor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 2
              }}
            >
              <Typography variant="h4" gutterBottom color="primary">
                Our Vision
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="body1" color='text.primary'>
                To be a premier institution delivering world-class education, nurturing talent, and creating knowledge leaders who will make a positive impact on society.
              </Typography>
            </Box>
          </Grid>

          {/* Development Info Section */}
          <Grid item xs={12}>
            <Box
              component={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              sx={{
                mt: 4,
                p: 4,
                bgcolor: alpha(theme.palette.secondary.main, 0.05),
                borderRadius: 2
              }}
            >
              <Typography variant="h4" gutterBottom color="secondary">
                <CodeIcon fontSize='large' /> Developer Information
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Typography variant="body1" color='text.primary'>
                This portal was developed by Jery J.S (<Link href="https://github.com/jeryjs" target="_blank" rel="noopener">GitHub Profile</Link>).<br/>
                Version 1.4.0 | Built with React and Material-UI | © 2024 Jain University
              </Typography>
              <Typography variant="body2" color="text.secondary">
                For technical support or inquiries, please contact the development team.
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default AboutPage;