import { Atom, BookOpen, Box, Braces, Dna, Github, Globe2, GraduationCap, Radio, type LucideIcon, Youtube } from "lucide-react";

export type Provider = { id:string; name:string; description:string; descriptionZh:string; category:string; categoryZh:string; color:string; icon:LucideIcon };
export const providers: Provider[] = [
  { id:"arxiv", name:"arXiv", description:"Preprints across physics, mathematics, computer science, and more.", descriptionZh:"覆盖物理、数学、计算机科学等领域的预印本。", category:"Papers", categoryZh:"论文", color:"#b31b1b", icon:BookOpen },
  { id:"openreview", name:"OpenReview", description:"Conference papers, reviews, and decisions published in real time.", descriptionZh:"实时发布会议论文、评审意见和录用结果。", category:"Conferences", categoryZh:"会议", color:"#8b5cf6", icon:GraduationCap },
  { id:"pubmed", name:"PubMed", description:"Biomedical literature from MEDLINE and life-science journals.", descriptionZh:"收录 MEDLINE 与生命科学期刊的生物医学文献。", category:"Biomedical", categoryZh:"生物医学", color:"#326599", icon:Dna },
  { id:"github", name:"GitHub", description:"Releases, repositories, topics, and trending projects.", descriptionZh:"监控版本发布、仓库、主题与趋势项目。", category:"Code", categoryZh:"代码", color:"#e4e4e7", icon:Github },
  { id:"openalex", name:"OpenAlex", description:"Open catalog of scholarly works, authors, and institutions.", descriptionZh:"开放的学术作品、作者与机构目录。", category:"Scholarly graph", categoryZh:"学术图谱", color:"#22c55e", icon:Globe2 },
  { id:"crossref", name:"Crossref", description:"Metadata for research objects across global publishers.", descriptionZh:"聚合全球出版机构研究成果的元数据。", category:"Metadata", categoryZh:"元数据", color:"#f59e0b", icon:Braces },
  { id:"biorxiv", name:"bioRxiv", description:"Preprints for biology and adjacent life sciences.", descriptionZh:"生物学及相关生命科学领域的预印本。", category:"Biomedical", categoryZh:"生物医学", color:"#ca8a04", icon:Dna },
  { id:"semantic", name:"Semantic Scholar", description:"Scientific literature across a broad range of research fields.", descriptionZh:"覆盖多个研究领域的科学文献数据库。", category:"Papers", categoryZh:"论文", color:"#0ea5e9", icon:BookOpen },
  { id:"huggingface", name:"Hugging Face", description:"Models, datasets, and research papers from Hugging Face.", descriptionZh:"监控 Hugging Face 的模型、数据集与研究论文。", category:"Models and data", categoryZh:"模型与数据", color:"#facc15", icon:Box },
  { id:"youtube", name:"YouTube", description:"Uploads from selected research channels and laboratories.", descriptionZh:"监控指定研究频道与实验室的新视频。", category:"Media", categoryZh:"媒体", color:"#ef4444", icon:Youtube },
  { id:"rsshub", name:"RSSHub", description:"Community-maintained routes for sites across the open web.", descriptionZh:"通过社区维护的路由连接开放互联网内容。", category:"Web", categoryZh:"互联网", color:"#6366f1", icon:Radio },
  { id:"custom", name:"Custom feed", description:"Connect a valid RSS or Atom endpoint.", descriptionZh:"连接有效的 RSS 或 Atom 地址。", category:"Custom", categoryZh:"自定义", color:"#a1a1aa", icon:Atom },
];

export type Finding = { title:string; source:string; publishedAt:string; url:string; keywords:string[] };
export const findings: Finding[] = [];
