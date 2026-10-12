# ROADMAP.md

## M1
- Deliverable: JavaScript widget that displays a persistent AI disclaimer banner when configured for known minor users, logs disclosure events (timestamp, page URL, user agent) to localStorage, and provides a simple API to manually trigger a disclosure check.
- Exit criterion (check a test could run): 
  1. When initialized with `{ minorUser: true }`, the widget inserts a visible disclaimer banner into the DOM.
  2. Calling `widget.logDisclosure()` adds an entry to the internal log with a timestamp and the current URL.
  3. The widget does not interfere with existing page functionality when the disclaimer is not shown (e.g., minorUser: false).

## M2
- Deliverable: Suicide ideation detection feature that scans user messages for self-harm language using a keyword list or lightweight NLP model, and when detected, returns a predefined crisis hotline response (e.g., "If you're feeling like you want to harm yourself or end your life, please call or text 988 to connect with the Suicide & Crisis Lifeline. You are not alone. Help is available 24/7.") and logs the event.
- Exit criterion:
  1. Given a user message containing phrases like "I want to die" or "I can't go on", the detection function returns true and provides the crisis hotline response.
  2. Given a neutral message like "How's the weather today?", the detection function returns false and does not interfere with normal AI response flow.
  3. Each detection event is logged with timestamp, detected phrase (hashed for privacy), and action taken.

## M3
- Deliverable: Output filtering to prevent the AI from generating statements that imply it provides professional mental or behavioral health care (e.g., "I am a licensed therapist", "I can diagnose your depression", "Take this medication as prescribed").
- Exit criterion:
  1. When the AI attempts to output a sentence containing prohibited phrases (e.g., "I am a therapist"), the filter blocks the output and returns a safe alternative like "I'm not a licensed mental health professional. For support with mental health concerns, please consult a qualified therapist or your doctor."
  2. The filter allows general supportive statements like "I'm here to listen" or "That sounds difficult" to pass through.
  3. Each filtering event is logged (without storing the blocked content) for potential reporting.

## M4
- Deliverable: Integration with a content moderation API (e.g., Perspective API) to detect and block sexually explicit content in user inputs and AI outputs, preventing the service from generating or facilitating such material.
- Exit criterion:
  1. When a user input scores above a toxicity threshold for sexually explicit content, the system blocks the input and returns a message like "I cannot process that request as it violates content policies."
  2. When the AI generates output that scores above the threshold, the system blocks the output and returns a safe completion like "I'm unable to provide that content."
  3. Each moderation event is logged (with only the category and action taken, not the content) for reporting purposes.

## M5
- Deliverable: Parent/guardian portal (simple web interface) allowing authorized adults to manage minor user's privacy and account settings, such as setting screen time limits, disabling data sharing, and reviewing disclosure logs (anonymized).
- Exit criterion:
  1. A verified parent/guardian can log in and view a dashboard showing the minor's usage statistics (e.g., total disclosure events, crisis referrals count) without seeing actual chat content.
  2. The parent/guardian can adjust settings like "Enable persistent disclaimer every 3 hours" or "Disable behavioral profiling" and see the changes take effect immediately for the minor's session.
  3. Changes to settings are logged with timestamp and administrator ID (hashed) for accountability.

## M6
- Deliverable: Automated annual report generation that compiles logged data into a PDF formatted for submission to the Hawaii Behavioral Health Administration, including: total crisis intervention referrals issued during the year, descriptions of suicide prevention protocols deployed (e.g., keyword detection + hotline response), confirmation of sexually explicit content safeguards enabled, and a statement that no personal chat logs are retained.
- Exit criterion:
  1. Given a set of logged events from the past year, the report generator produces a PDF containing the required sections with accurate counts and descriptions.
  2. The report does not include any personally identifiable information (PII) or chat content, only aggregated statistics and protocol descriptions.
  3. The PDF meets the formatting requirements specified by the Hawaii DOH for annual compliance reports (e.g., includes provider name, reporting period, contact information, and signature line).

## M7
- Deliverable: Refined JavaScript widget/SDK with simplified initialization (e.g., `<script src="https://cdn.aidis.sh/widget.js" data-site="site_id" data-env="production"></script>`) and automatic environment detection (development vs production).
- Exit criterion:
  1. Integration requires adding only a script tag and minimal configuration (site ID, optional minor user detection callback).
  2. The widget automatically loads the latest version from the CDN and initializes without blocking page load.
  3. In production mode, the widget minifies its code and uses compressed assets for performance.