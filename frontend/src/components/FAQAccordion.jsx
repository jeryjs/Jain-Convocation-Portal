import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqData = [
  {
    question: "I forgot my registered phone number. How can I recover my login details?",
    answer: "If you cannot recall your registered phone number, please contact the help desk counters to confirm your details. They can help you retrieve your registered information."
  },
  {
    question: "How can I download my digital photos?",
    answer: "1. Navigate to Sessions > Select your batch time > Gallery\n2. Select up to 4 photos and click Request\n3. Once approved, you can download them from the request page\n4. Photos will also be sent to your registered email"
  },
  {
    question: "Can I order a printed (hard) copy of my photo?",
    answer: "1. In Gallery, select up to 4 photos\n2. Choose 'Hard Copy' when requesting\n3. Make payment via UPI (₹500 per print)\n4. Upload payment screenshot\n5. Collect prints from the assigned counter"
  },
  {
    question: "What payment methods are accepted for ordering a hard copy?",
    answer: "Through the app, only UPI payments are accepted.\nYou can pay in cash directly at the counter."
  },
  {
    question: "How long will it take to receive the hard copy of my photo?",
    answer: "After successful payment, the hard copy is typically processed and will be ready in 1 hour.\nThe waiting time may vary depending on the number of requests."
  },
  {
    question: "Who can I contact if I have questions or encounter issues?",
    answer: "For any questions or technical issues, please reach out to our support team or student services department."
  }
];

function FAQAccordion() {
  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto' }}>
      {faqData.map((faq, index) => (
        <Accordion key={index} sx={{ mb: 1, borderRadius: '8px !important' }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ 
              backgroundColor: 'primary.main',
              color: 'white',
              borderRadius: '8px',
              '&.Mui-expanded': {
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
              }
            }}
          >
            <Typography fontWeight="500">{faq.question}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              {faq.answer}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

export default FAQAccordion;