"""Convert the supplied Markdown checklist into catalog data.

Usage: python3 scripts/import-guide.py '/path/to/guide.txt'
Review generated links against provider sites before publishing.
"""
import json
import re
import sys
from pathlib import Path

source = Path(sys.argv[1]).read_text(encoding='utf-8').splitlines()
category_by_section = {
    1: 'Cloud', 2: 'Cloud', 3: 'Cloud', 4: 'Linux', 5: 'Web',
    6: 'Containers', 7: 'Containers', 8: 'DevOps', 9: 'Web',
    10: 'Web', 11: 'Cloud', 12: 'DevOps', 13: 'Web', 14: 'Web',
    15: 'Web', 16: 'Data & AI', 17: 'Web', 18: 'Marketing',
    19: 'Security', 20: 'DevOps', 21: 'Data & AI'
}
provider_by_section = {
    1: 'Microsoft Learn', 2: 'AWS', 3: 'Google Cloud', 5: 'F5 NGINX',
    6: 'Docker', 7: 'CNCF Kubernetes', 8: 'HashiCorp',
    9: 'Vercel Academy', 10: 'Netlify', 11: 'Cloudflare',
    12: 'GitHub', 14: 'Svelte', 15: 'Python', 20: 'Observability'
}
section = 0
subsection = ''
items = []
seen = set()
pattern = re.compile(r'^- \[ \] \*\*(P[123]) \| (CERT|BADGE|COURSE|DOCS|RESOURCE) — (.+?)\*\*')
for index, line in enumerate(source):
    section_match = re.match(r'^# (\d+)\. ', line)
    if section_match:
        section = int(section_match.group(1))
        subsection = ''
        continue
    if line.startswith('## '):
        subsection = line[3:].strip()
    match = pattern.match(line)
    if not match or section not in category_by_section:
        continue
    priority, resource_type, title = match.groups()
    block = []
    for following in source[index + 1:]:
        if following.startswith('- [ ]') or following.startswith('#'):
            break
        block.append(following.strip())
    urls = re.findall(r'https?://[^\s)]+', '\n'.join(block))
    if not urls:
        continue
    url = urls[0].rstrip('.,')
    focus = next((row.removeprefix('- Focus: ').strip() for row in block if row.startswith('- Focus: ')), '')
    provider = provider_by_section.get(section, subsection or 'Official resource')
    if section in (4, 13, 16, 17, 18, 19, 21) and subsection:
        provider = subsection
    if section == 6 and subsection == 'Mirantis Certification':
        provider = 'Mirantis Docker'
    if section == 19 and subsection == 'Cloud Security':
        provider = 'Cloudflare' if 'Cloudflare' in title else 'AWS'
    if section == 14 and title == 'Svelte on Vercel':
        provider = 'Vercel Academy'
    if section == 18 and subsection == 'GEO / AEO / AI Search Discoverability':
        provider = 'Search & structured data'
    key = (title.lower(), url.rstrip('/'))
    if key in seen:
        continue
    seen.add(key)
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')
    item = {
        'id': f'guide-{section}-{resource_type.lower()}-{slug}',
        'provider': provider,
        'title': title,
        'category': category_by_section[section],
        'kind': 'credential' if resource_type == 'CERT' else 'resource',
        'summary': focus or f'Official {resource_type.lower()} from {provider}.',
        'url': url,
        'priority': priority,
        'resourceType': resource_type,
    }
    if resource_type == 'CERT' and provider in {'Microsoft Learn', 'AWS', 'Google Cloud', 'Linux Foundation', 'Red Hat', 'Linux Professional Institute', 'CNCF Kubernetes', 'F5 NGINX', 'GitHub'}:
        item['badge'] = True
    items.append(item)

target = Path(__file__).resolve().parents[1] / 'src' / 'guide-catalog.json'
target.write_text(json.dumps(items, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'Wrote {len(items)} entries to {target}')
