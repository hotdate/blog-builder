IBMSA Website Build
==================

This package contains a bilingual EN/FR website generated from the uploaded IBMSA build guide while keeping the same premium design language as the reference site.

Structure
---------
- /index.html -> browser language redirect
- /en/ -> English pages
- /fr/ -> French pages
- /css/, /js/, /images/ -> shared assets
- /sitemap.xml, /sitemap-en.xml, /sitemap-fr.xml, /robots.txt

Deployment
----------
1. Upload all files and folders to your web root.
2. Make sure the site opens from /index.html.
3. Update any placeholder office address, Cameroon phone, and social profile links before going live.
4. If you want a server-side contact form later, replace the current mailto form behaviour in js/main.js with your preferred PHP mail handler.

Known placeholders
------------------
- Australian street address
- Cameroon phone / WhatsApp / address
- Social profile URLs
- Team photos and some visual assets are branded placeholders generated for this build

Contact form
------------
The contact form is intentionally database-free and shared-hosting friendly.
It opens a prefilled email draft to richard@ibmsa.com.au.



IMPORTANT CLEAN DEPLOY NOTE
---------------------------
If the live website shows duplicated menus, broken mobile header layout, mixed branding, or pages that look different from each other, do NOT merge this build into older site files.

Recommended deployment method:
1. Backup the current live site.
2. Delete the old public site files for this project from the server.
3. Upload this build as a clean replacement.
4. Clear any host/server cache and browser cache.
5. Confirm that /css/style.css and /js/main.js are the latest versions.

A mixed upload can make the site render with old HTML/CSS/JS combinations.
