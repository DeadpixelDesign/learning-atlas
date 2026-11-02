import guideItems from './guide-catalog.json';

// Category values are stable IDs. Personal display names live in the library.
export type Category = string;
export type Kind = 'resource' | 'credential';
export type EntryType = 'Resource' | 'Career Path' | 'Course' | 'Certificate';
export const categoryOptions: Category[] = ['Cloud', 'Linux', 'Containers', 'Web', 'DevOps', 'Security', 'Data & AI', 'Marketing', 'AEO / SEO / SMO'];
export type Item = {
  id: string;
  provider: string;
  title: string;
  category: Category;
  kind: Kind;
  summary: string;
  url: string;
  badge?: boolean;
  priority?: 'P1' | 'P2' | 'P3';
  resourceType?: string;
  entryType?: EntryType;
};

// Each URL points to a provider-owned page. Resource entries are not certifications.
const core: Item[] = [
  { id: 'ahrefs-aeo-course', provider: 'Ahrefs Academy', title: 'Answer Engine Optimization (AEO) Course', category: 'AEO / SEO / SMO', kind: 'resource', entryType: 'Course', summary: 'Free course on AI search, citations, content strategy, and measuring AEO results.', url: 'https://ahrefs.com/academy/aeo-course', priority: 'P1' },
  { id: 'microsoft-learn', provider: 'Microsoft Learn', title: 'Learning paths and modules', category: 'Cloud', kind: 'resource', summary: 'Browse guided Microsoft and Azure training.', url: 'https://learn.microsoft.com/training/' },
  { id: 'microsoft-credentials', provider: 'Microsoft Learn', title: 'Microsoft Credentials', category: 'Cloud', kind: 'resource', summary: 'Browse Microsoft exams and Applied Skills assessments.', url: 'https://learn.microsoft.com/credentials/' },
  { id: 'aws-skill-builder', provider: 'AWS', title: 'AWS Skill Builder', category: 'Cloud', kind: 'resource', summary: 'Digital training and learning plans for AWS.', url: 'https://skillbuilder.aws/' },
  { id: 'aws-cert', provider: 'AWS', title: 'AWS Certification catalog', category: 'Cloud', kind: 'resource', summary: 'Official AWS certification catalog and exam information.', url: 'https://aws.amazon.com/certification/' },
  { id: 'google-training', provider: 'Google Cloud', title: 'Google Cloud training', category: 'Cloud', kind: 'resource', summary: 'Courses, labs, and learning paths for Google Cloud.', url: 'https://cloud.google.com/learn/training' },
  { id: 'google-cert', provider: 'Google Cloud', title: 'Google Cloud certifications catalog', category: 'Cloud', kind: 'resource', summary: 'Explore official associate and professional exams.', url: 'https://cloud.google.com/learn/certification' },
  { id: 'lf-paths', provider: 'Linux Foundation', title: 'Linux Foundation learning paths', category: 'Linux', kind: 'resource', summary: 'Open source learning paths, including Linux and cloud native.', url: 'https://training.linuxfoundation.org/learning-paths/' },
  { id: 'redhat-training', provider: 'Red Hat', title: 'Red Hat course catalog', category: 'Linux', kind: 'resource', summary: 'Courses and exams for Red Hat technologies.', url: 'https://www.redhat.com/en/services/training/all-courses-exams' },
  { id: 'redhat-cert', provider: 'Red Hat', title: 'Red Hat certifications catalog', category: 'Linux', kind: 'resource', summary: 'Explore Red Hat certification tracks and exams.', url: 'https://www.redhat.com/en/services/certifications' },
  { id: 'lpi-learning', provider: 'LPI', title: 'LPI Learning', category: 'Linux', kind: 'resource', summary: 'Free learning materials aligned to LPI exams.', url: 'https://learning.lpi.org/' },
  { id: 'lpi-lpic1', provider: 'LPI', title: 'LPIC-1', category: 'Linux', kind: 'credential', summary: 'Linux administrator certification and exam objectives.', url: 'https://www.lpi.org/our-certifications/lpic-1-overview/', badge: true },
  { id: 'comptia-training', provider: 'CompTIA', title: 'CompTIA training', category: 'Linux', kind: 'resource', summary: 'Explore official exam preparation and training products.', url: 'https://www.comptia.org/en-us/training/' },
  { id: 'comptia-linux', provider: 'CompTIA', title: 'CompTIA Linux+', category: 'Linux', kind: 'credential', summary: 'Linux+ certification overview and exam details.', url: 'https://www.comptia.org/en-us/certifications/linux/', badge: true },
  { id: 'suse-training', provider: 'SUSE', title: 'SUSE training', category: 'Linux', kind: 'resource', summary: 'SUSE courses and eLearning options.', url: 'https://www.suse.com/training/' },
  { id: 'apache-httpd', provider: 'Apache', title: 'Apache HTTP Server documentation', category: 'Web', kind: 'resource', summary: 'Official HTTP Server manuals and guides; no ASF credential is implied.', url: 'https://httpd.apache.org/docs/' },
  { id: 'nginx-docs', provider: 'F5 NGINX', title: 'NGINX documentation', category: 'Web', kind: 'resource', summary: 'Official NGINX guides and reference documentation.', url: 'https://nginx.org/en/docs/' },
  { id: 'nginx-training', provider: 'F5 NGINX', title: 'F5 NGINX training', category: 'Web', kind: 'resource', summary: 'F5 learning resources for NGINX products.', url: 'https://www.f5.com/learn/training' },
  { id: 'cncf-k8s', provider: 'CNCF Kubernetes', title: 'Introduction to Kubernetes', category: 'Containers', kind: 'resource', summary: 'Linux Foundation introductory Kubernetes course.', url: 'https://training.linuxfoundation.org/training/introduction-to-kubernetes/' },
  { id: 'cncf-cka', provider: 'CNCF Kubernetes', title: 'Certified Kubernetes Administrator', category: 'Containers', kind: 'credential', summary: 'CNCF and Linux Foundation CKA exam.', url: 'https://training.linuxfoundation.org/certification/certified-kubernetes-administrator-cka/', badge: true },
  { id: 'cncf-ckad', provider: 'CNCF Kubernetes', title: 'Certified Kubernetes Application Developer', category: 'Containers', kind: 'credential', summary: 'CNCF and Linux Foundation CKAD exam.', url: 'https://training.linuxfoundation.org/certification/certified-kubernetes-application-developer-ckad/', badge: true },
  { id: 'vercel-academy', provider: 'Vercel Academy', title: 'Vercel Academy', category: 'Web', kind: 'resource', summary: 'Project based courses on Vercel and web development. Some courses may award certificates.', url: 'https://vercel.com/academy' },
  { id: 'netlify-guides', provider: 'Netlify', title: 'Netlify Developer Guides', category: 'Web', kind: 'resource', summary: 'Official tutorials, examples, and platform guides.', url: 'https://developers.netlify.com/guides/' },
  { id: 'cloudflare-paths', provider: 'Cloudflare', title: 'Cloudflare learning paths', category: 'Web', kind: 'resource', summary: 'Tutorials and learning paths for Cloudflare products.', url: 'https://developers.cloudflare.com/resources/' },
  { id: 'canonical-academy', provider: 'Canonical Academy', title: 'Canonical Academy', category: 'Linux', kind: 'resource', summary: 'Official Ubuntu certification program and preparation resources.', url: 'https://canonical.com/academy', priority: 'P1' },
  { id: 'canonical-terminal', provider: 'Canonical Academy', title: 'Using Linux Terminal', category: 'Linux', kind: 'credential', summary: 'Canonical Academy individual examination. See the official exam guide.', url: 'https://canonical.com/academy/exam-guide', badge: true, priority: 'P1' },
  { id: 'canonical-desktop', provider: 'Canonical Academy', title: 'Using Ubuntu Desktop', category: 'Linux', kind: 'credential', summary: 'Canonical Academy individual examination. See the official exam guide.', url: 'https://canonical.com/academy/exam-guide', badge: true, priority: 'P2' },
  { id: 'canonical-server', provider: 'Canonical Academy', title: 'Using Ubuntu Server', category: 'Linux', kind: 'credential', summary: 'Canonical Academy individual examination. See the official exam guide.', url: 'https://canonical.com/academy/exam-guide', badge: true, priority: 'P1' },
  { id: 'canonical-devops', provider: 'Canonical Academy', title: 'Using DevOps Principles', category: 'Linux', kind: 'credential', summary: 'Listed as beta on Canonical Academy; check availability before scheduling.', url: 'https://canonical.com/academy/exam-guide', priority: 'P2' },
  { id: 'canonical-sysadmin', provider: 'Canonical Academy', title: 'Canonical SysAdmin Qualification', category: 'Linux', kind: 'credential', summary: 'Requires all four Canonical Academy examinations; mark awarded only after issuer confirmation.', url: 'https://canonical.com/academy', badge: true, priority: 'P1' },
  { id: 'ubuntu-server-docs', provider: 'Canonical', title: 'Ubuntu Server documentation', category: 'Linux', kind: 'resource', summary: 'Official Ubuntu Server documentation.', url: 'https://documentation.ubuntu.com/server/', priority: 'P1' },
  { id: 'ubuntu-docs', provider: 'Canonical', title: 'Ubuntu documentation', category: 'Linux', kind: 'resource', summary: 'Official Ubuntu documentation hub.', url: 'https://documentation.ubuntu.com/', priority: 'P1' }
];

const keyFor = (item: Item) => `${item.title.toLowerCase()}|${item.url.replace(/\/$/, '')}`;
export const catalog: Item[] = [...core];
const seen = new Map(core.map((item) => [keyFor(item), item]));
for (const item of guideItems as Item[]) {
  const key = keyFor(item);
  const existing = seen.get(key);
  if (existing) {
    existing.priority ??= item.priority;
    existing.resourceType ??= item.resourceType;
    existing.badge ??= item.badge;
  } else {
    catalog.push(item);
    seen.set(key, item);
  }
}
