import json
import logging

from fastapi import APIRouter, File, UploadFile, Form
from models.tags import TagSuggestRequest, TagSuggestResponse
from services.summarization_service import summarization_service
from services.pdf_service import pdf_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Tags"])

RESEARCH_TOPICS = [
    "Artificial Intelligence", "Machine Learning", "Deep Learning",
    "Natural Language Processing", "Computer Vision", "Data Mining",
    "Big Data Analytics", "Cloud Computing", "Cybersecurity",
    "Information Security", "Blockchain Technology", "Internet of Things (IoT)",
    "Software Engineering", "Software Architecture", "Database Systems",
    "Distributed Systems", "Computer Networks", "Operating Systems",
    "Algorithm Design", "Compiler Design", "Human-Computer Interaction",
    "Computer Graphics", "Game Development", "Mobile Computing",
    "Web Technologies", "Embedded Systems", "Parallel Computing",
    "Quantum Computing", "Reinforcement Learning", "Robotics",
    "Autonomous Systems", "Edge Computing", "DevOps",
    "Microservices Architecture", "Formal Methods", "Augmented Reality",
    "Virtual Reality", "Image Processing", "Signal Processing",
    "Speech Recognition", "Recommender Systems", "Social Network Analysis",
    "Bioinformatics", "Computational Biology", "Data Science", "Data Visualization",
    "Power Systems", "Control Systems", "VLSI Design", "Microelectronics",
    "Telecommunications", "Wireless Communications", "Antenna Design",
    "Radar Systems", "Digital Signal Processing", "Analog Circuit Design",
    "Power Electronics", "Renewable Energy Systems", "Smart Grid",
    "Photovoltaic Systems", "Electromagnetic Theory", "RF Engineering",
    "Sensor Technology", "Thermodynamics", "Fluid Mechanics", "Heat Transfer",
    "Materials Science", "Solid Mechanics", "Manufacturing Engineering",
    "Mechatronics", "Aerospace Engineering", "Automotive Engineering",
    "HVAC Systems", "CAD/CAM", "Finite Element Analysis",
    "Computational Fluid Dynamics", "Tribology", "Vibration Analysis",
    "3D Printing / Additive Manufacturing", "Nanotechnology",
    "Structural Engineering", "Geotechnical Engineering",
    "Transportation Engineering", "Water Resources Engineering",
    "Environmental Engineering", "Construction Management",
    "Earthquake Engineering", "Coastal Engineering", "Urban Planning",
    "Sustainable Construction", "Bridge Engineering",
    "Biomedical Imaging", "Medical Devices", "Tissue Engineering",
    "Biomechanics", "Biosensors", "Neural Engineering",
    "Rehabilitation Engineering", "Drug Delivery Systems", "Biomaterials",
    "Chemical Process Engineering", "Polymer Science", "Catalysis",
    "Petrochemical Engineering", "Biochemical Engineering",
    "Membrane Technology", "Corrosion Engineering", "Food Engineering",
    "Operations Research", "Supply Chain Management", "Quality Engineering",
    "Ergonomics", "Production Planning", "Lean Manufacturing",
    "Simulation Modeling", "Decision Science", "Project Management", "Logistics",
    "Applied Mathematics", "Pure Mathematics", "Statistics",
    "Probability Theory", "Numerical Analysis", "Linear Algebra",
    "Topology", "Graph Theory", "Cryptography", "Mathematical Optimization",
    "Stochastic Processes", "Differential Equations", "Combinatorics",
    "Quantum Physics", "Particle Physics", "Condensed Matter Physics",
    "Optics", "Nuclear Physics", "Astrophysics", "Plasma Physics",
    "Theoretical Physics", "Biophysics", "Photonics",
    "Organic Chemistry", "Inorganic Chemistry", "Analytical Chemistry",
    "Physical Chemistry", "Computational Chemistry", "Medicinal Chemistry",
    "Electrochemistry", "Green Chemistry", "Spectroscopy",
    "Molecular Biology", "Genetics", "Microbiology", "Ecology",
    "Biotechnology", "Cell Biology", "Immunology", "Neuroscience",
    "Evolutionary Biology", "Marine Biology", "Zoology", "Botany",
    "Genomics", "Proteomics",
    "Cardiology", "Oncology", "Neurology", "Orthopedics", "Pediatrics",
    "Dermatology", "Psychiatry", "Radiology", "Surgery", "Pharmacology",
    "Epidemiology", "Public Health", "Clinical Research", "Pathology",
    "Internal Medicine", "Emergency Medicine",
    "Microeconomics", "Macroeconomics", "Behavioral Economics",
    "Financial Economics", "International Trade", "Econometrics",
    "Marketing", "Strategic Management", "Organizational Behavior",
    "Entrepreneurship", "Accounting", "Finance", "Banking",
    "Risk Management", "Business Analytics", "Digital Marketing",
    "E-Commerce", "Corporate Governance", "Human Resources Management",
    "Innovation Management",
    "Constitutional Law", "Criminal Law", "International Law",
    "Environmental Law", "Intellectual Property Law", "Commercial Law",
    "Human Rights Law", "Cyber Law", "Labor Law",
    "Comparative Politics", "Political Theory", "International Relations",
    "Security Studies", "Public Policy", "Conflict Resolution",
    "Diplomacy", "Political Economy", "Geopolitics",
    "Clinical Psychology", "Cognitive Psychology", "Developmental Psychology",
    "Social Psychology", "Educational Psychology", "Neuropsychology",
    "Positive Psychology", "Industrial-Organizational Psychology",
    "Forensic Psychology",
    "Urban Sociology", "Cultural Studies", "Gender Studies",
    "Migration Studies", "Media Studies", "Social Inequality",
    "Criminology", "Demography",
    "Educational Technology", "Curriculum Development", "Special Education",
    "Distance Learning", "STEM Education", "Language Education",
    "Higher Education", "Early Childhood Education",
    "Assessment and Evaluation",
    "Sustainable Architecture", "Interior Design", "Landscape Architecture",
    "Architectural History", "Building Information Modeling",
    "Digital Architecture", "Conservation and Restoration",
    "Climate Change", "Sustainability", "Waste Management", "Air Quality",
    "Water Treatment", "Biodiversity Conservation",
    "Environmental Impact Assessment", "Renewable Energy", "Carbon Capture",
    "Agronomy", "Plant Sciences", "Soil Science", "Animal Science",
    "Agricultural Economics", "Food Science", "Precision Agriculture",
    "Sustainable Agriculture",
    "Mass Communication", "Journalism", "Public Relations", "Advertising",
    "Digital Media", "Film Studies", "Visual Communication",
    "Ethics", "Epistemology", "Logic", "Philosophy of Science",
    "Philosophy of Mind", "Aesthetics",
    "Ancient History", "Medieval History", "Modern History",
    "Ottoman History", "Art History", "Archaeology", "Cultural Heritage",
    "Applied Linguistics", "Sociolinguistics", "Psycholinguistics",
    "Computational Linguistics", "Corpus Linguistics", "Translation Studies",
    "Phonetics", "Morphology", "Syntax", "Semantics", "Pragmatics",
]

TAG_SUGGEST_PROMPT = """You are an expert academic classifier. Given the following research text, suggest the most relevant research topic tags from the provided list.

RULES:
- Return ONLY tags from the provided list, exactly as written
- Suggest {max_suggestions} tags, ranked by relevance
- Do NOT suggest tags that are already assigned
- Return a JSON array of strings, nothing else

AVAILABLE TAGS:
{available_tags}

ALREADY ASSIGNED TAGS (do not suggest these):
{existing_tags}

RESEARCH TEXT:
{text}

Return ONLY a JSON array like: ["Tag1", "Tag2", "Tag3"]"""


@router.post("/tags/suggest", response_model=TagSuggestResponse)
def suggest_tags(request: TagSuggestRequest):
    if not summarization_service.client:
        logger.error("Groq client not initialized")
        return TagSuggestResponse(suggested_tags=[])

    text = request.text.strip()
    if len(text) < 10:
        return TagSuggestResponse(suggested_tags=[])

    existing_lower = {t.lower() for t in request.existing_tags}
    available = [t for t in RESEARCH_TOPICS if t.lower() not in existing_lower]

    prompt = TAG_SUGGEST_PROMPT.format(
        max_suggestions=request.max_suggestions,
        available_tags="\n".join(available),
        existing_tags=", ".join(request.existing_tags) if request.existing_tags else "(none)",
        text=text[:3000],
    )

    try:
        response = summarization_service.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=256,
        )
        raw = response.choices[0].message.content.strip()
        start = raw.find("[")
        end = raw.rfind("]")
        if start == -1 or end == -1:
            logger.warning(f"[TagSuggest] No JSON array in response: {raw}")
            return TagSuggestResponse(suggested_tags=[])

        tags = json.loads(raw[start : end + 1])

        valid_set = {t.lower(): t for t in RESEARCH_TOPICS}
        validated = []
        for tag in tags:
            if isinstance(tag, str) and tag.lower() in valid_set and tag.lower() not in existing_lower:
                validated.append(valid_set[tag.lower()])

        logger.info(f"[TagSuggest] Suggested {len(validated)} tags: {validated}")
        return TagSuggestResponse(suggested_tags=validated[: request.max_suggestions])

    except Exception as e:
        logger.error(f"[TagSuggest] Error: {e}")
        return TagSuggestResponse(suggested_tags=[])


@router.post("/tags/suggest-from-file", response_model=TagSuggestResponse)
async def suggest_tags_from_file(
    file: UploadFile = File(...),
    existing_tags: str = Form(""),
    max_suggestions: int = Form(6),
):
    """Extract full text from a PDF and suggest tags based on the entire content."""
    if not summarization_service.client:
        logger.error("Groq client not initialized")
        return TagSuggestResponse(suggested_tags=[])

    pdf_bytes = await file.read()
    full_text = pdf_service.extract_text(pdf_bytes)
    abstract = pdf_service.extract_abstract(full_text) or ""
    keywords = pdf_service.extract_keywords(full_text)

    kw_text = ", ".join(keywords) if keywords else ""
    # Build a rich text: abstract + keywords + beginning of paper for context
    analysis_text = f"{abstract}\n\nKeywords: {kw_text}\n\n{full_text[:2500]}"

    parsed_existing = [t.strip() for t in existing_tags.split(",") if t.strip()] if existing_tags else []
    existing_lower = {t.lower() for t in parsed_existing}
    available = [t for t in RESEARCH_TOPICS if t.lower() not in existing_lower]

    prompt = TAG_SUGGEST_PROMPT.format(
        max_suggestions=max_suggestions,
        available_tags="\n".join(available),
        existing_tags=", ".join(parsed_existing) if parsed_existing else "(none)",
        text=analysis_text[:3000],
    )

    try:
        response = summarization_service.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=256,
        )
        raw = response.choices[0].message.content.strip()
        start = raw.find("[")
        end = raw.rfind("]")
        if start == -1 or end == -1:
            logger.warning(f"[TagSuggestFile] No JSON array in response: {raw}")
            return TagSuggestResponse(suggested_tags=[])

        tags = json.loads(raw[start : end + 1])
        valid_set = {t.lower(): t for t in RESEARCH_TOPICS}
        validated = []
        for tag in tags:
            if isinstance(tag, str) and tag.lower() in valid_set and tag.lower() not in existing_lower:
                validated.append(valid_set[tag.lower()])

        logger.info(f"[TagSuggestFile] Suggested {len(validated)} tags: {validated}")
        return TagSuggestResponse(suggested_tags=validated[:max_suggestions])

    except Exception as e:
        logger.error(f"[TagSuggestFile] Error: {e}")
        return TagSuggestResponse(suggested_tags=[])
