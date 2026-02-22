/* eslint-disable @typescript-eslint/no-require-imports */
import type { TDocumentDefinitions, Content, ContentColumns, StyleDictionary } from 'pdfmake/interfaces'
import resumeJson from '../../../content/giancarlo_papa_resume.json'

// pdfmake 0.3.x exports a singleton via module.exports; types only cover 0.2.x browser API.
// We declare the subset of the server API we actually use.
type FontDef = Partial<Record<'normal' | 'bold' | 'italics' | 'bolditalics', string | Buffer>>
interface IPdfMake {
  addFonts(fonts: Record<string, FontDef>): void
  createPdf(def: TDocumentDefinitions): { getBuffer(): Promise<Buffer> }
}

const ACCENT = '#57c7ff'
const TEXT_DARK = '#0f172a'
const TEXT_MUTED = '#64748b'
const TEXT_BODY = '#334155'

export default defineEventHandler(async (event) => {
  // pdfmake is CJS; grab via createRequire so it works in Nitro's ESM context
  const { createRequire } = await import('node:module')
  const _require = createRequire(import.meta.url)
  const pdfmake = _require('pdfmake') as IPdfMake

  // Load avatar bundled as a server asset
  let avatarDataUrl: string | undefined
  try {
    const buf = await useStorage('assets/server').getItemRaw('images/avatar.jpeg')
    if (buf) {
      avatarDataUrl = `data:image/jpeg;base64,${Buffer.from(buf as ArrayBuffer).toString('base64')}`
    }
  }
  catch { /* avatar is optional */ }

  pdfmake.addFonts({
    Courier: {
      normal: 'Courier',
      bold: 'Courier-Bold',
      italics: 'Courier-Oblique',
      bolditalics: 'Courier-BoldOblique'
    }
  })

  const { basics, work, skills, languages, education } = resumeJson

  function fmtDate(d: string): string {
    if (!d || d.toLowerCase() === 'present') return 'Present'
    const parts = d.split('-')
    const y = parts[0] ?? d
    const m = parts[1]
    if (!m) return y
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en', { month: 'short', year: 'numeric' })
  }

  function sectionHeader(title: string): Content {
    return {
      stack: [
        { text: ' ', fontSize: 8 },
        { text: title, style: 'sectionHeader' },
        {
          canvas: [{
            type: 'line',
            x1: 0, y1: 3, x2: 495, y2: 3,
            lineWidth: 1.5,
            lineColor: ACCENT
          }]
        },
        { text: ' ', fontSize: 6 }
      ]
    }
  }

  function workEntry(job: typeof work[0]): Content {
    return {
      columns: [
        {
          stack: [
            { text: `${fmtDate(job.startDate)} –\n${fmtDate(job.endDate)}`, style: 'dateCol' },
            { text: job.location ?? '', style: 'dateColMuted', margin: [0, 2, 0, 0] as [number, number, number, number] }
          ],
          width: 95
        },
        {
          stack: [
            { text: job.position, style: 'jobTitle' },
            { text: job.name, style: 'company' },
            { text: job.summary ?? '', style: 'body', margin: [0, 4, 0, 0] as [number, number, number, number] },
            ...(job.highlights?.map(h => ({
              columns: [
                { text: '–', width: 10, style: 'body' },
                { text: h, style: 'body', width: '*' }
              ],
              margin: [0, 2, 0, 0] as [number, number, number, number]
            } as ContentColumns)) ?? [])
          ],
          width: '*'
        }
      ],
      margin: [0, 0, 0, 10] as [number, number, number, number]
    } as ContentColumns
  }

  function skillGroup(g: typeof skills[0]): Content {
    return {
      stack: [
        { text: g.name, style: 'skillTitle' },
        ...g.keywords.map(k => ({
          columns: [
            { text: '•', width: 10, fontSize: 8, color: ACCENT },
            { text: k, style: 'body', width: '*' }
          ]
        } as ContentColumns)),
        { text: ' ', fontSize: 5 }
      ]
    }
  }

  const half = Math.ceil(skills.length / 2)
  const skillsColumns: ContentColumns = {
    columns: [
      { stack: skills.slice(0, half).map(skillGroup), width: '*' },
      { width: 15, text: '' },
      { stack: skills.slice(half).map(skillGroup), width: '*' }
    ]
  }

  const recentWork = work.filter(j => j.endDate === 'Present' || Number(j.startDate.split('-')[0]) >= 2012)
  const earlyWork = work.filter(j => j.endDate !== 'Present' && Number(j.startDate.split('-')[0]) < 2012)

  const headerStack = [
    { text: basics.name.toUpperCase(), style: 'name' },
    { text: basics.label, style: 'subtitle' },
    { text: ' ', fontSize: 5 },
    { text: `${basics.email}   ·   ${basics.phone}`, style: 'contact' },
    {
      text: `${basics.location.city} ${basics.location.region}, ${basics.location.countryCode}   ·   ${basics.url.replace('https://', '')}`,
      style: 'contact'
    },
    { text: basics.profiles.map(p => p.url.replace('https://', '')).join('   ·   '), style: 'contact' }
  ]

  const headerSection: Content = avatarDataUrl
    ? ({
        columns: [
          { stack: headerStack, width: '*' },
          { image: avatarDataUrl, width: 72, height: 72, alignment: 'right' }
        ]
      } as ContentColumns)
    : { stack: headerStack }

  const styles: StyleDictionary = {
    name: { fontSize: 20, bold: true, color: TEXT_DARK },
    subtitle: { fontSize: 12, italics: true, color: TEXT_MUTED, margin: [0, 3, 0, 0] as [number, number, number, number] },
    contact: { fontSize: 8, color: TEXT_MUTED, margin: [0, 2, 0, 0] as [number, number, number, number] },
    sectionHeader: {
      fontSize: 9,
      bold: true,
      color: ACCENT,
      characterSpacing: 1.5,
      margin: [0, 0, 0, 3] as [number, number, number, number]
    },
    jobTitle: { fontSize: 9, bold: true, color: TEXT_DARK },
    company: { fontSize: 8, color: TEXT_MUTED },
    dateCol: { fontSize: 8, color: TEXT_DARK },
    dateColMuted: { fontSize: 7.5, color: TEXT_MUTED },
    body: { fontSize: 8.5, color: TEXT_BODY, lineHeight: 1.45 },
    skillTitle: { fontSize: 9, bold: true, color: TEXT_DARK, margin: [0, 0, 0, 3] as [number, number, number, number] }
  }

  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [50, 50, 50, 60],
    defaultStyle: { font: 'Courier', fontSize: 9, lineHeight: 1.4, color: TEXT_DARK },
    styles,
    footer: (currentPage: number, pageCount: number): Content => ({
      columns: [
        { text: basics.name.toUpperCase(), fontSize: 7.5, color: TEXT_MUTED },
        { text: basics.email, fontSize: 7.5, color: TEXT_MUTED, alignment: 'center' },
        { text: `${currentPage} / ${pageCount}`, fontSize: 7.5, color: TEXT_MUTED, alignment: 'right' }
      ],
      margin: [50, 8, 50, 0] as [number, number, number, number]
    } as ContentColumns),
    content: [
      headerSection,
      { text: ' ', fontSize: 8 },
      { text: basics.summary, style: 'body' },

      sectionHeader('PROFESSIONAL EXPERIENCE'),
      ...recentWork.map(workEntry),

      ...(earlyWork.length
        ? [sectionHeader('EARLY CAREER & FOUNDATION (Pre-2012)'), ...earlyWork.map(workEntry)]
        : []
      ),

      sectionHeader('TECHNICAL SKILLS'),
      skillsColumns,

      sectionHeader('LANGUAGES'),
      {
        text: languages.flatMap((l, i) => [
          { text: l.language, bold: true },
          { text: ` (— ${l.fluency})${i < languages.length - 1 ? '   |   ' : ''}` }
        ])
      },

      sectionHeader('EDUCATION'),
      ...education.map(edu => ({
        stack: [
          { text: edu.institution, style: 'jobTitle' },
          { text: [edu.studyType, edu.area].filter(Boolean).join(' · '), style: 'company' },
          { text: [edu.startDate, edu.endDate].filter(Boolean).join(' – '), style: 'dateColMuted' }
        ],
        margin: [0, 0, 0, 8] as [number, number, number, number]
      }))
    ]
  }

  const buffer = await pdfmake.createPdf(docDef).getBuffer()

  setResponseHeaders(event, {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="giancarlo_papa_resume.pdf"',
    'Content-Length': String(buffer.length)
  })

  return buffer
})
