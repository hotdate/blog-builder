#!/usr/bin/env python3
"""
SEO Audit Fix Script for IBMSA Website
Fixes:
1. Broken CSS links in fr/cameroun/index.html
2. Team member image references (change from name-based to member-N.png)
3. Missing og:image meta tags
4. Title length issues (too short <30 or too long >60)
5. Meta description issues (too short <120, too long >160, or missing)
6. 404 page structured data and meta description
"""

import os
import re
from pathlib import Path

BASE_DIR = Path("/workspace/ibmsa-website-fixed")

# Team member mapping: filename -> member image number
TEAM_MEMBER_MAP = {
    "richard-morfaw.html": "member-1.png",
    "jerome-morfaw.html": "member-2.png", 
    "rebecca-rudd-morfaw.html": "member-3.png",
    "jefkin-nkaka.html": "member-4.png",
}

# Default og:image for pages without specific images
DEFAULT_OG_IMAGE = "https://ibmsa.com.au/images/logo.png"

def fix_css_link(content, filepath):
    """Fix broken CSS link in fr/cameroun/index.html"""
    if "fr/cameroun/index.html" in str(filepath):
        # Fix ../css/style.css to ../../css/style.css
        content = content.replace('href="../css/style.css"', 'href="../../css/style.css"')
        content = content.replace("href='../css/style.css'", "href='../../css/style.css'")
    return content

def fix_team_images(content, filepath):
    """Fix team member image references"""
    if "/team/" in str(filepath) or "/equipe/" in str(filepath):
        filename = filepath.name
        if filename in TEAM_MEMBER_MAP:
            image_file = TEAM_MEMBER_MAP[filename]
            # Replace the image src with the correct member-N.png
            old_pattern = r'src="\.\./\.\./images/team/[^"]+\.png"'
            new_src = f'src="../../images/team/{image_file}"'
            content = re.sub(old_pattern, new_src, content)
            
            old_pattern_single = r"src='\.\./\.\./images/team/[^']+\.png'"
            new_src_single = f"src='../../images/team/{image_file}'"
            content = re.sub(old_pattern_single, new_src_single, content)
    return content

def add_og_image(content, filepath):
    """Add og:image meta tag if missing"""
    if '<meta property="og:image"' not in content and "og:image" not in content:
        # Find where to insert - after other og tags or after description
        og_image_tag = f'<meta property="og:image" content="{DEFAULT_OG_IMAGE}">'
        
        # Try to insert after og:description or og:title
        if '<meta property="og:description"' in content:
            content = content.replace(
                '<meta property="og:description"',
                f'{og_image_tag}\n<meta property="og:description"'
            )
        elif '<meta property="og:title"' in content:
            content = content.replace(
                '<meta property="og:title"',
                f'{og_image_tag}\n<meta property="og:title"'
            )
        elif '<meta name="description"' in content:
            content = content.replace(
                '<meta name="description"',
                f'{og_image_tag}\n<meta name="description"'
            )
        else:
            # Insert after charset
            content = content.replace(
                '<meta charset="utf-8">',
                f'<meta charset="utf-8">\n{og_image_tag}'
            )
    return content

def fix_title_length(content, filepath):
    """Fix title length issues"""
    title_match = re.search(r'<title>([^<]+)</title>', content)
    if title_match:
        title = title_match.group(1)
        # Remove pipe and site name for length calculation
        clean_title = title.split('|')[0].strip()
        
        if len(clean_title) < 30:
            # Title too short - enhance it
            if "IBMSA" not in title and "team" in title.lower():
                new_title = title.replace("</title>", " | IBMSA Team</title>")
                content = content.replace(title_match.group(0), new_title)
            elif "IBMSA" not in title:
                new_title = title.replace("</title>", " | IBMSA</title>")
                content = content.replace(title_match.group(0), new_title)
        elif len(clean_title) > 60:
            # Title too long - truncate intelligently
            if len(clean_title) > 60:
                truncated = clean_title[:57].rsplit(' ', 1)[0] + "..."
                if "|" in title:
                    parts = title.split("|")
                    new_title = f"{truncated.strip()} | {parts[-1].strip()}" if len(parts) > 1 else truncated
                else:
                    new_title = truncated
                content = content.replace(title_match.group(0), f"<title>{new_title}</title>")
    
    return content

def fix_meta_description(content, filepath):
    """Fix meta description issues"""
    desc_match = re.search(r'<meta name="description" content="([^"]*)"', content)
    
    if not desc_match:
        # Missing description - add one based on content
        title_match = re.search(r'<title>([^<]+)</title>', content)
        if title_match:
            title = title_match.group(1).split('|')[0].strip()
            default_desc = f"Learn more about {title} at IBMSA. Professional business consulting and coaching services."
            desc_tag = f'<meta name="description" content="{default_desc}">'
            content = content.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n{desc_tag}')
        return content
    
    description = desc_match.group(1)
    if len(description) < 120:
        # Too short - enhance it
        enhanced = description.rstrip('.') + ". Contact IBMSA for professional business consulting services."
        if len(enhanced) > 160:
            enhanced = description.rstrip('.') + ". Learn more about our services."
        content = content.replace(desc_match.group(0), f'<meta name="description" content="{enhanced}">')
    elif len(description) > 160:
        # Too long - truncate
        truncated = description[:157].rsplit(' ', 1)[0] + "..."
        content = content.replace(desc_match.group(0), f'<meta name="description" content="{truncated}">')
    
    return content

def fix_404_page(content, filepath):
    """Add structured data and proper meta description to 404 page"""
    if "404.html" in str(filepath):
        # Add meta description if missing
        if '<meta name="description"' not in content:
            desc_tag = '<meta name="description" content="Page not found. Return to the IBMSA homepage or browse our services.">'
            content = content.replace('<meta charset="utf-8">', f'<meta charset="utf-8">\n{desc_tag}')
        
        # Add structured data if missing
        if '"@type": "WebSite"' not in content and '"@type":"WebSite"' not in content:
            structured_data = '''<script type="application/ld+json">{"@context": "https://schema.org", "@type": "WebSite", "name": "IBMSA", "url": "https://ibmsa.com.au", "potentialAction": {"@type": "SearchAction", "target": "https://ibmsa.com.au/en/search.html?q={search_term_string}", "query-input": "required name=search_term_string"}}</script>'''
            # Insert before </head>
            content = content.replace('</head>', f'{structured_data}\n</head>')
    
    return content

def process_file(filepath):
    """Process a single HTML file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Apply all fixes
        content = fix_css_link(content, filepath)
        content = fix_team_images(content, filepath)
        content = add_og_image(content, filepath)
        content = fix_title_length(content, filepath)
        content = fix_meta_description(content, filepath)
        content = fix_404_page(content, filepath)
        
        # Only write if changes were made
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    html_files = list(BASE_DIR.rglob("*.html"))
    print(f"Found {len(html_files)} HTML files to process")
    
    fixed_count = 0
    for filepath in html_files:
        if process_file(filepath):
            fixed_count += 1
            print(f"✓ Fixed: {filepath.relative_to(BASE_DIR)}")
    
    print(f"\nCompleted! Fixed {fixed_count} out of {len(html_files)} files.")

if __name__ == "__main__":
    main()
