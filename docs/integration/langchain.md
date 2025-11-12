# LangChain + AxonFlow Integration

## Overview

**LangChain** provides powerful orchestration primitives for building LLM applications.
**AxonFlow** adds production-grade governance, audit trails, and multi-tenant isolation.

Together, they enable enterprises to deploy complex AI workflows with compliance and observability.

---

## Why Use AxonFlow with LangChain?

### LangChain Strengths
- ✅ Rich library of chains, agents, and tools
- ✅ Multi-step workflow orchestration
- ✅ Integration with 100+ data sources
- ✅ RAG (Retrieval Augmented Generation) support
- ✅ Active community and ecosystem

### AxonFlow Strengths
- ✅ **Policy enforcement** (budget limits, PII filtering, content moderation)
- ✅ **Audit trails** (compliance requirements: HIPAA, GDPR, SOC 2)
- ✅ **Multi-tenant isolation** (customer data separation)
- ✅ **Sub-10ms overhead** (production performance)
- ✅ **Multi-model routing** (OpenAI, Anthropic, Bedrock, custom LLMs)

### The Perfect Combination
```
LangChain handles: Complex orchestration, RAG, data integration
AxonFlow handles: Governance, compliance, audit, multi-tenancy
```

---

## Integration Patterns

### Pattern 1: AxonFlow as LangChain Tool (Recommended)

Use AxonFlow agent as a tool within LangChain workflows for governed data access.

**Use Case:** LangChain orchestrates workflow, AxonFlow enforces policies on sensitive operations.

**Example:**
```python
from langchain.agents import initialize_agent, Tool
from langchain.llms import OpenAI
from axonflow import AxonFlowClient

# Initialize AxonFlow client
axonflow = AxonFlowClient(
    endpoint="https://your-axonflow.com",
    license_key="your-license-key"
)

# Create AxonFlow tool for governed database access
def query_patient_database(query: str) -> str:
    """Query patient database with HIPAA compliance policies."""
    result = axonflow.execute_query(
        query=query,
        request_type="sql",
        context={"connector": "patient_db"}
    )
    return result["data"]

# Define tools for LangChain agent
tools = [
    Tool(
        name="Query Patient Database",
        func=query_patient_database,
        description="Query patient database with HIPAA compliance. Use for medical records, diagnoses, treatments."
    ),
    # Add other tools...
]

# Initialize LangChain agent
llm = OpenAI(temperature=0)
agent = initialize_agent(
    tools,
    llm,
    agent="zero-shot-react-description",
    verbose=True
)

# Execute workflow with governance
response = agent.run("Find patients with fever and cough in last 7 days")
```

**Benefits:**
- LangChain provides intelligent routing to tools
- AxonFlow enforces policies before database access
- Audit trail captures all patient data queries
- HIPAA compliance maintained

---

### Pattern 2: LangChain as AxonFlow LLM Provider

Use LangChain's LLM abstractions within AxonFlow's governance layer.

**Use Case:** AxonFlow orchestrates multi-agent workflow, LangChain provides LLM routing.

**Example:**
```python
from langchain.chat_models import ChatOpenAI, ChatAnthropic
from langchain.llms import Bedrock
from axonflow import AxonFlowClient

# Initialize LangChain LLMs
openai_llm = ChatOpenAI(model="gpt-4", temperature=0.7)
anthropic_llm = ChatAnthropic(model="claude-3-sonnet-20240229")
bedrock_llm = Bedrock(model_id="anthropic.claude-3-sonnet-20240229-v1:0")

# AxonFlow custom LLM provider
class LangChainLLMProvider:
    def __init__(self, default_llm="openai"):
        self.llms = {
            "openai": openai_llm,
            "anthropic": anthropic_llm,
            "bedrock": bedrock_llm
        }
        self.default = default_llm

    def generate(self, prompt: str, model: str = None) -> str:
        llm = self.llms.get(model or self.default)
        response = llm.predict(prompt)
        return response

# Register with AxonFlow
axonflow = AxonFlowClient(
    endpoint="https://your-axonflow.com",
    license_key="your-license-key",
    llm_provider=LangChainLLMProvider(default_llm="bedrock")
)

# AxonFlow handles policies, LangChain handles LLM routing
result = axonflow.execute_agent(
    agent_id="medical_diagnosis",
    input={"symptoms": "fever, cough", "patient_id": "12345"}
)
```

**Benefits:**
- Leverage LangChain's multi-model support
- AxonFlow enforces budget limits across all LLMs
- Unified policy enforcement regardless of LLM provider
- Cost tracking and optimization

---

### Pattern 3: Parallel Architecture (Enterprise Recommended)

LangChain handles complex orchestration, AxonFlow provides governance layer.

**Use Case:** Enterprise teams with existing LangChain workflows need compliance without refactoring.

**Architecture:**
```
User Request
  ↓
LangChain Orchestration (chains, agents, tools)
  ↓
AxonFlow Governance Layer (policies, audit, multi-tenancy)
  ↓
Data Sources (databases, APIs, knowledge bases)
```

**Example:**
```python
from langchain.chains import ConversationalRetrievalChain
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from langchain.llms import OpenAI
from axonflow import AxonFlowClient

# Initialize AxonFlow for governance
axonflow = AxonFlowClient(
    endpoint="https://your-axonflow.com",
    license_key="your-license-key"
)

# LangChain RAG setup
embeddings = OpenAIEmbeddings()
vectorstore = Chroma(
    persist_directory="./patient_knowledge",
    embedding_function=embeddings
)
retriever = vectorstore.as_retriever()

# LangChain conversation chain
llm = OpenAI(temperature=0)
qa_chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=retriever,
    return_source_documents=True
)

# Wrapper for governance
def governed_qa(question: str, chat_history: list, user_token: str) -> dict:
    # AxonFlow policy check before LangChain execution
    policy_result = axonflow.check_policy(
        action="rag_query",
        user_token=user_token,
        context={"question": question}
    )

    if not policy_result["allowed"]:
        return {"answer": f"Policy violation: {policy_result['reason']}"}

    # Execute LangChain RAG
    result = qa_chain({"question": question, "chat_history": chat_history})

    # AxonFlow audit logging
    axonflow.log_audit(
        action="rag_query",
        user_token=user_token,
        query=question,
        result=result["answer"],
        sources=[doc.metadata for doc in result["source_documents"]]
    )

    return result

# Usage with governance
response = governed_qa(
    question="What are the treatment options for Type 2 diabetes?",
    chat_history=[],
    user_token="doctor-token-123"
)
```

**Benefits:**
- Minimal changes to existing LangChain code
- Policy enforcement and audit trails added
- Multi-tenant isolation (different doctors see different data)
- Compliance requirements met (HIPAA, GDPR)

---

## Decision Matrix: When to Use Each Pattern

| Scenario | Recommended Pattern | Reasoning |
|----------|---------------------|-----------|
| New LangChain project with compliance needs | **Pattern 1** (AxonFlow as Tool) | Clean separation, easy to reason about |
| Existing LangChain project needs governance | **Pattern 3** (Parallel Architecture) | Minimal refactoring required |
| Multi-model LLM routing with budget control | **Pattern 2** (LangChain as Provider) | Leverage LangChain's LLM abstractions |
| Complex RAG with sensitive data | **Pattern 3** (Parallel Architecture) | Policy check before retrieval |
| Multi-tenant SaaS application | **Pattern 3** (Parallel Architecture) | AxonFlow handles tenant isolation |

---

## Production Deployment Best Practices

### 1. Policy Configuration

Define policies in AxonFlow before deploying LangChain workflows:

```yaml
# Example policy: Budget limit for medical diagnosis agent
policy:
  name: "medical-diagnosis-budget"
  type: "budget_limit"
  scope: "agent:medical_diagnosis"
  limit: 1000  # Max 1000 tokens per request
  action: "deny"  # Deny requests exceeding limit
```

### 2. Audit Trail Setup

Ensure all LangChain tool executions are logged:

```python
# Wrapper for any LangChain tool
def with_audit(tool_func):
    def wrapper(input_str: str, **kwargs):
        # Log input
        axonflow.log_audit(
            action="tool_execution",
            tool=tool_func.__name__,
            input=input_str
        )

        # Execute tool
        result = tool_func(input_str, **kwargs)

        # Log output
        axonflow.log_audit(
            action="tool_execution",
            tool=tool_func.__name__,
            output=result
        )

        return result
    return wrapper

# Apply to all tools
tools = [
    Tool(
        name="Database Query",
        func=with_audit(query_database),
        description="..."
    )
]
```

### 3. Error Handling

Handle both LangChain and AxonFlow errors gracefully:

```python
try:
    # LangChain execution
    result = agent.run(query)
except Exception as langchain_error:
    # Log LangChain error
    axonflow.log_error(
        error_type="langchain_execution",
        error=str(langchain_error)
    )
    raise
```

### 4. Performance Monitoring

Track latency for both LangChain and AxonFlow:

```python
import time

def execute_with_monitoring(agent, query):
    start_time = time.time()

    # LangChain execution
    langchain_start = time.time()
    result = agent.run(query)
    langchain_duration = time.time() - langchain_start

    # AxonFlow policy check duration (from audit logs)
    total_duration = time.time() - start_time
    governance_overhead = total_duration - langchain_duration

    # Log metrics
    axonflow.log_metrics(
        langchain_duration_ms=langchain_duration * 1000,
        governance_overhead_ms=governance_overhead * 1000,
        total_duration_ms=total_duration * 1000
    )

    return result
```

**Expected Overhead:** AxonFlow adds <10ms (sub-10ms P95) for policy enforcement.

---

## Complete Example: Medical Diagnosis System

```python
from langchain.agents import initialize_agent, AgentType, Tool
from langchain.llms import OpenAI
from langchain.chains import ConversationalRetrievalChain
from langchain.vectorstores import Chroma
from langchain.embeddings import OpenAIEmbeddings
from axonflow import AxonFlowClient

# Initialize AxonFlow with HIPAA policies
axonflow = AxonFlowClient(
    endpoint="https://your-axonflow.com",
    license_key="your-license-key",
    tenant_id="hospital-xyz"
)

# Tool 1: Query patient database (governed)
def query_patient_db(query: str) -> str:
    """Query patient records with HIPAA compliance."""
    result = axonflow.execute_query(
        query=query,
        request_type="sql",
        context={"connector": "patient_db"}
    )
    return result["data"]

# Tool 2: Search medical knowledge base (LangChain RAG)
embeddings = OpenAIEmbeddings()
vectorstore = Chroma(
    persist_directory="./medical_knowledge",
    embedding_function=embeddings
)

def search_medical_knowledge(question: str) -> str:
    """Search medical knowledge base for diagnosis guidance."""
    retriever = vectorstore.as_retriever()
    docs = retriever.get_relevant_documents(question)
    return "\n".join([doc.page_content for doc in docs[:3]])

# Tool 3: Calculate drug interactions (governed)
def check_drug_interactions(medications: str) -> str:
    """Check for dangerous drug interactions."""
    result = axonflow.execute_query(
        query=medications,
        request_type="drug_interaction_check",
        context={"service": "fda_api"}
    )
    return result["data"]

# Combine tools
tools = [
    Tool(
        name="Patient Database",
        func=query_patient_db,
        description="Query patient medical records (HIPAA compliant)"
    ),
    Tool(
        name="Medical Knowledge",
        func=search_medical_knowledge,
        description="Search medical knowledge base for diagnosis guidance"
    ),
    Tool(
        name="Drug Interactions",
        func=check_drug_interactions,
        description="Check for drug interactions and contraindications"
    )
]

# Initialize LangChain agent
llm = OpenAI(temperature=0, model="gpt-4")
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True,
    max_iterations=5
)

# Execute medical diagnosis workflow
def diagnose_patient(patient_id: str, symptoms: str, doctor_token: str):
    """Complete medical diagnosis with governance and compliance."""

    # AxonFlow verifies doctor has access to patient
    access_check = axonflow.check_access(
        user_token=doctor_token,
        resource=f"patient:{patient_id}",
        action="read"
    )

    if not access_check["allowed"]:
        return {"error": "Access denied: Doctor not authorized for this patient"}

    # LangChain orchestrates multi-step diagnosis
    query = f"Diagnose patient {patient_id} with symptoms: {symptoms}. " \
            f"Check their medical history, search knowledge base, and verify drug interactions."

    diagnosis = agent.run(query)

    # AxonFlow logs complete audit trail
    axonflow.log_audit(
        action="medical_diagnosis",
        doctor_token=doctor_token,
        patient_id=patient_id,
        symptoms=symptoms,
        diagnosis=diagnosis
    )

    return {"diagnosis": diagnosis, "audit_id": axonflow.last_audit_id}

# Usage
result = diagnose_patient(
    patient_id="P-12345",
    symptoms="persistent cough, fever, fatigue",
    doctor_token="dr-smith-token"
)
print(result["diagnosis"])
```

---

## Troubleshooting

### Issue 1: AxonFlow policies blocking LangChain tools

**Symptom:** LangChain tool execution returns "Policy violation" error.

**Solution:**
1. Check AxonFlow policy configuration
2. Verify user token has required permissions
3. Review audit logs for policy denial reason

```python
# Debug policy
policy_result = axonflow.check_policy(
    action="tool_execution",
    user_token="user-token",
    context={"tool": "database_query"}
)
print(policy_result)  # Shows why policy denied
```

### Issue 2: High latency with AxonFlow + LangChain

**Symptom:** Total response time >5 seconds.

**Solution:**
1. Measure LangChain vs AxonFlow latency separately
2. AxonFlow should add <10ms overhead
3. If AxonFlow >10ms, check network latency to AxonFlow endpoint

```python
# Profile latency
import time

start = time.time()
langchain_result = agent.run(query)
langchain_time = time.time() - start

axonflow_overhead = axonflow.get_last_request_duration()
print(f"LangChain: {langchain_time*1000:.2f}ms, AxonFlow: {axonflow_overhead:.2f}ms")
```

### Issue 3: Audit logs not capturing LangChain tool calls

**Symptom:** AxonFlow dashboard shows no audit entries for tool executions.

**Solution:**
Wrap all LangChain tools with audit logging:

```python
def with_audit(tool_func, tool_name):
    def wrapper(input_str: str):
        axonflow.log_audit(action="tool_start", tool=tool_name, input=input_str)
        result = tool_func(input_str)
        axonflow.log_audit(action="tool_complete", tool=tool_name, output=result)
        return result
    return wrapper
```

---

## Further Reading

- **LangChain Documentation:** https://python.langchain.com/docs/
- **AxonFlow API Reference:** https://docs.getaxonflow.com/api/
- **HIPAA Compliance Guide:** https://docs.getaxonflow.com/security/hipaa
- **Multi-Tenant Best Practices:** https://docs.getaxonflow.com/deployment/multi-tenancy

---

## Support

For integration support, contact:
- **LangChain Community:** https://github.com/langchain-ai/langchain/discussions
- **AxonFlow Support:** support@getaxonflow.com

---

**Last Updated:** November 11, 2025
**Tested with:** LangChain v0.1.0, AxonFlow v1.0.12
