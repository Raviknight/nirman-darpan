// Nirman Darpan — runtime config.
//
// Loaded as a classic <script> so it runs before app.js.
// When Appwrite is set up (see docs/APPWRITE_SETUP.md), replace the placeholder
// projectId below with the value from your Appwrite project console.
//
// As long as projectId === "PASTE_PROJECT_ID_HERE", the site runs in in-memory
// mode (no persistence, sign-in disabled). The moment a real projectId is here,
// app.js wires up Appwrite for comments, votes, and verified resident sign-in.

window.NIRMAN_APPWRITE = {
  endpoint:   "https://nyc.cloud.appwrite.io/v1",
  projectId:  "6a34470a0010b8e65407",
  databaseId: "6a344b6f002c3a7ca279",
  collections: {
    comments:       "comments",
    votes:          "votes",
    accountability: "accountability_entries",
    suggestions:    "project_suggestions",
  },
  buckets: {
    evidence: "evidence",
  },
};

// Convenience flag used by app.js — don't edit.
window.NIRMAN_APPWRITE_READY =
  !!(window.NIRMAN_APPWRITE && window.NIRMAN_APPWRITE.projectId
     && window.NIRMAN_APPWRITE.projectId !== "PASTE_PROJECT_ID_HERE");
