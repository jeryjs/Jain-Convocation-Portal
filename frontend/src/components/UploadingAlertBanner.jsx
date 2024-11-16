import React from "react"
import { Alert } from "@mui/material";
import config from "../config";


export default function UploadingAlertBanner() {
    if (config.SHOW_UPLOAD_ALERT) {
    return (
        <Alert
            severity="info"
            sx={{
                mb: 3,
                mx: 1,
                '& .MuiAlert-message': {
                    width: '100%',
                    textAlign: 'center'
                }
            }}
        >
            Dear all, we are currently in the process of uploading the photos. This may take approximately 10 minutes to complete. Thank you for your patience.
        </Alert>
    );
    }
}