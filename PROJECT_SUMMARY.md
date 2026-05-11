# Executive Project Summary: Hustad Residential Tablet Platform

## 📊 Project Overview
The Hustad Residential Tablet Platform is a premium, enterprise-grade mobile application designed for field representatives to manage the end-to-end lifecycle of residential roofing inspections—from lead curation and sales pipeline management to high-fidelity forensic data collection and backend synchronization.

---

## 🏛️ System Architecture
The platform follows a modern, decoupled cloud-native architecture optimized for performance on iPad and tablet hardware.

### 1. Technology Stack
*   **Frontend**: Next.js 14 (React) with TypeScript.
*   **Styling**: Tailwind CSS with a custom "Executive Dark Mode" glassmorphic design system.
*   **State Management**: Event-driven architecture using `window.dispatchEvent` and `CustomEvents` for decoupled view switching.
*   **Backend**: Next.js API Routes (Node.js runtime).
*   **Database**: Supabase (PostgreSQL) for real-time storage and complex relational mapping.
*   **Authentication**: Azure AD (Microsoft Entra ID) via NextAuth.js for secure, enterprise SSO.
*   **Integrations**: Bidirectional sync with **CenterPoint Connect** via a secure REST API proxy.

### 2. Data Infrastructure
*   **Supabase (Primary DB)**: Stores Pipeline Leads, Inspection Sessions, Photos, and Audit Logs.
*   **CenterPoint (Source of Truth)**: Raw job data is cached locally; final inspection statuses and timestamps are synced back via an Outbound Queue.
*   **Outbound Queue**: A proprietary "Retry-Safe" staging layer that prevents data loss during synchronization by tracking `pending`, `synced`, and `failed` states.

---

## 🔄 Data Lifecycle & Workflow
The system operates on a linear, gated workflow designed to prevent data corruption:

1.  **CP Inbox**: Raw jobs imported from CenterPoint.
2.  **Sales Pipeline**: Rep-managed layer where leads are nurtured, called, and scheduled.
3.  **Inspection Engine**: The forensic dossier collector (signature capture, photo categorization).
4.  **Sync Engine**: Automated outbound worker that pushes results back to the corporate CenterPoint instance.

---

## ✅ Completed Milestones (What is Done)
- [x] **Enterprise Auth**: Full Azure AD integration for secure rep login.
- [x] **Advanced Pipeline Dashboard**: High-fidelity UI with real-time stats, lifecycle tracking, and "Remove from Pipeline" guards.
- [x] **CenterPoint Sync Layer**: Bidirectional import/export logic with "Retry-Safe" outbound queueing.
- [x] **Forensic Inspection UI**: Premium, glassmorphic inspection interface with photo management.
- [x] **Navigation Hardening**: Unified "Back" navigation and view-switching across all modules.
- [x] **Address-based De-duplication**: Automatic cleanup of duplicate drafts to prevent dashboard clutter.

---

## 🛠️ Remaining Requirements (What to Complete)
1.  **Automated Cron Job**: The `outbound_queue` currently requires a trigger. Implementing a Vercel Cron or GitHub Action to run the processor every 15 minutes is required for full automation.
2.  **PDF/Dossier Generation**: Finalize the server-side PDF generation for the Forensic Dossier (currently in draft).
3.  **Offline Persistence (PWA)**: Implement Service Workers to allow data entry during total signal loss (currently requires intermittent signal for API calls).
4.  **Admin Override UI**: A dashboard for managers to force-delete leads that are "locked" due to active inspection status.

---

## 🚀 Operational Deployment
*   **Environment**: Production is hosted on **Vercel** (iad1 region).
*   **CI/CD**: Automatic deployments triggered by pushes to the `main` branch of the GitHub repository.
*   **Target Devices**: Optimized for **iPad Pro / iPad Air** running Safari/Chrome.
*   **Monitoring**: Integrated with Vercel Logs and Supabase Dashboard for real-time error tracking.

---

> [!IMPORTANT]
> **Data Safety Note**: The "Remove from Pipeline" action is non-destructive to CenterPoint data. It resets the `inbox_status` to `new`, allowing for complete workflow reversibility without data loss.
