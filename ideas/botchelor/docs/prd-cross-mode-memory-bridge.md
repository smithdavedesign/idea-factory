# Product Requirements Document (PRD): Cross-Mode Memory Bridge (SFW ⇄ After Dark)

## 1. Executive Summary
Currently, Botchelor's SFW companion chats and After Dark "Step In" sessions operate in strict isolation. While this prevents content moderation trips on SFW endpoints, it creates an immersion-breaking amnesia effect where characters forget established chemistry, relationship milestones, and shared history when transitioning between modes. 

This PRD outlines a **Cross-Mode Memory Bridge** that securely syncs high-level narrative state, emotional standing, and key milestones across modes without polluting raw explicit dialogue logs into SFW prompt pipelines.

---

## 2. Objectives & Success Metrics
- **Objectives:**
  - Establish seamless narrative continuity between SFW dates/chats and After Dark "Step In" sessions.
  - Prevent model moderation/refusal errors on SFW endpoints by keeping explicit text out of SFW contexts.
  - Preserve character personality consistency and relationship progression.
- **Success Metrics:**
  - Zero SFW LLM provider refusal errors due to context leakage.
  - User qualitative feedback confirming characters "remember our date" upon stepping into After Dark.

---

## 3. Architecture & Data Flow

### A. The Shared Core Memory Layer ()
A centralized database table () linked to the character and user pair, storing distilled metadata rather than raw chat transcripts.

- **Entity Schema ():**
  - uid=501(davidsmith) gid=20(staff) groups=20(staff),12(everyone),61(localaccounts),79(_appserverusr),80(admin),81(_appserveradm),701(com.apple.sharepoint.group.1),33(_appstore),98(_lpadmin),100(_lpoperator),204(_developer),250(_analyticsusers),395(com.apple.access_ftp),398(com.apple.access_screensharing),399(com.apple.access_ssh),400(com.apple.access_remote_ae): UUID (PK)
  - : UUID (FK)
  - : UUID (FK)
  - : Enum (acquiring, dating, intimate, bonded)
  - : Integer (0-100)
  - : JSONB Array (e.g., )
  - : JSONB Array
  - : Timestamp

### B. Mode-Specific Ingestion & Summarization Workers
1. **SFW → After Dark Bridge:**
   - When a user finishes a significant SFW date or chat session, a background summarizer job () runs locally using a lightweight LLM.
   - It extracts 2-3 key relationship facts or romantic milestones and appends them to .
   - When entering After Dark mode, the system injects these milestones into the character's system prompt: *"Context from your recent date with the user: [milestones]."*
2. **After Dark → SFW Bridge (Sanitized Summary):**
   - When an After Dark session ends, a sanitization filter extracts *only* high-level relationship progression (e.g., "grew closer during a late-night conversation") while stripping out explicit physical acts, anatomical specifics, or NSFW dialogue.
   - This sanitized update bumps the  and  so the SFW chat reflects that intimacy level without exposing explicit text to SFW safety filters.

---

## 4. Detailed Functional Requirements

### FR-1: Milestone Extractor
- Must automatically trigger at the conclusion of a SFW date or chat session.
- Must filter output against a strict keyword/content blacklist to ensure no accidental explicit leakage enters shared state.

### FR-2: Prompt Injector
- **For After Dark:** Inject  and  into the initial greeting and system context.
- **For SFW:** Inject only  and sanitized relationship summaries.

### FR-3: Privacy & Safety Guardrails
- Raw chat logs from After Dark mode must **never** be readable by SFW endpoints or logged in SFW chat history tables.
- Database entries in  must be encrypted at rest and tied strictly to user privacy policies.

---

## 5. Implementation Plan & Milestones
- **Phase 1 (Database & Schema):** Create  table and Drizzle schema definitions in RepoHQ / Botchelor.
- **Phase 2 (Summarization Logic):** Implement the background LLM summarizer and content sanitization filters.
- **Phase 3 (Prompt Integration):** Update both SFW and After Dark prompt builders to consume the shared memory context.
- **Phase 4 (Testing & QA):** Verify transition flows and test SFW endpoint safety filter compliance.
