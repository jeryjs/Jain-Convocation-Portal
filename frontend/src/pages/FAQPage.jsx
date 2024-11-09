import React from 'react';
import { Box, Paper, Typography, Container } from '@mui/material';
import PageHeader from '../components/PageHeader';
import FAQAccordion from '../components/FAQAccordion';
import { useLocation } from 'react-router-dom';

function FAQPage() {
  const location = useLocation();
  const showHeader = !location.state?.hideHeader;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
      {showHeader && (
        <PageHeader
          pageTitle="Frequently Asked Questions"
          pageSubtitle="Find answers to common questions about the convocation portal"
          breadcrumbs={['Home', 'FAQ']}
        />
      )}
      
      <Container maxWidth="lg" sx={{ py: 4, mt: showHeader ? 0 : 4 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            backgroundColor: 'transparent'
          }}
        >
          <Typography
            variant="h4"
            align="center"
            gutterBottom
            sx={{ mb: 4, color: 'primary.main', fontWeight: 600 }}
          >
            Frequently Asked Questions
          </Typography>
          <FAQAccordion />
        </Paper>
      </Container>
    </Box>
  );
}

export default FAQPage;