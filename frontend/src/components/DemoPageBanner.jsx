import React from "react"
import { Alert } from "@mui/material";
import config from "../config";


export default function DemoPageBanner() {
    if (!"config.SHOW_UPLOAD_ALERT") {
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
                This portal is currently in archive mode following the completion of the Convocation Event. You are viewing a demo version with limited functionality, showcasing sample content from each category (5 photographs per folder).
            </Alert>
        );
    }
}