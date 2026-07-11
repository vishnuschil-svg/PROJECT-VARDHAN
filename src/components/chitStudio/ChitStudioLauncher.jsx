import { useMemo, useState } from "react";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { RuleEngine } from "../../domain/chit/services/RuleEngine.js";
import { ScheduleEngine } from "../../domain/chit/services/ScheduleEngine.js";
import { validateSchedule } from "../../services/chitScheduleService.js";
import { createChitGroupFromStudio, generateChitStudioProposals, getChitCreationModes } from "../../services/chitStudioService.js";
import { saveChitTemplate, listChitTemplates } from "../../services/chitTemplateService.js";
import { simulateChitPlan } from "../../services/chitSimulationService.js";
import ChitCreationMethod from "./ChitCreationMethod";
import BeginnerDesigner from "./BeginnerDesigner";
import PlanComparison from "./PlanComparison";
import ScheduleEditor from "./ScheduleEditor";
import RuleEditor from "./RuleEditor";
import TemplateLibrary from "./TemplateLibrary";
import SmartCaptureUploader from "./SmartCaptureUploader";
import SimulationPanel from "./SimulationPanel";
import FinalChitPreview from "./FinalChitPreview";
import OrganizerMemoryPanel from "./OrganizerMemoryPanel";
import "./ChitStudio.css";

const DEFAULT_BASIC = {
  chitName: "Schedule Driven Chit",
  chitCode: "",
  chitValue: 100000,
  totalMembers: 20,
  totalMonths: 20,
  duration: 20,
  members: 20,
  monthlyAmount: 5000,
  startDate: "",
  endDate: "",
  organizer: "",
  branch: "",
  currency: "INR",
  language: "en",
  commissionValue: 5,
  riskPreference: "BALANCED",
  collectionFrequency: "Monthly",
};

function ChitStudioLauncher({ activeTenantContext, onCreated, showCreateGroupButton = false, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [mode, setMode] = useState("AI_DESIGN");
  const [basic, setBasic] = useState(DEFAULT_BASIC);
  const [ruleSet, setRuleSet] = useState(() => RuleEngine.createDefault({ commissionValue: 5 }));
  const [schedule, setSchedule] = useState(() => ScheduleEngine.generateRows({ ...DEFAULT_BASIC, standardPayment: DEFAULT_BASIC.monthlyAmount, totalMonths: DEFAULT_BASIC.totalMonths, chitValue: DEFAULT_BASIC.chitValue }));
  const [proposals, setProposals] = useState([]);
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [message, setMessage] = useState("");
  const modes = useMemo(() => getChitCreationModes(), []);
  const templates = useMemo(() => isOpen ? listChitTemplates(activeTenantContext) : [], [activeTenantContext, isOpen]);
  const validation = useMemo(() => ({ schedule: validateSchedule(schedule, ruleSet), ruleSet: { errors: [], warnings: [] } }), [schedule, ruleSet]);
  const simulation = useMemo(() => simulateChitPlan({ schedule, memberCount: basic.totalMembers || basic.members }), [schedule, basic.totalMembers, basic.members]);

  const generatePlans = () => {
    const next = generateChitStudioProposals(basic);
    setProposals(next);
    setSelectedProposalId(next[1]?.id || next[0]?.id || "");
    if (next[1]) {
      setRuleSet(next[1].ruleSet);
      setSchedule(next[1].schedule);
    }
  };
  const selectProposal = (id) => {
    const proposal = proposals.find((item) => item.id === id);
    setSelectedProposalId(id);
    if (proposal) {
      setRuleSet(proposal.ruleSet);
      setSchedule(proposal.schedule);
    }
  };
  const saveTemplate = () => {
    const result = saveChitTemplate({ name: basic.chitName, category: ruleSet.paymentPatternType, ruleSet, schedule, status: "CONFIRMED", sourceType: "CHIT_STUDIO" }, activeTenantContext);
    setMessage(result.success ? `Template saved: ${result.template.name}` : result.message);
  };
  const createGroup = () => {
    const result = createChitGroupFromStudio({ basic, ruleSet, schedule, activeTenantContext });
    setMessage(result.success ? `Created group: ${result.group.chit_name}` : result.message);
    if (result.success) onCreated?.();
  };

  return (
    <>
      <Button variant="success" onClick={() => setIsOpen(true)}>AI Chit Studio</Button>
      {showCreateGroupButton && (
        <Button variant="primary" onClick={() => setIsOpen(true)}>Create Group</Button>
      )}
      <Modal isOpen={isOpen} title="AI Chit Studio" size="large" onClose={() => setIsOpen(false)} footer={<Button onClick={() => setIsOpen(false)}>Close</Button>}>
        <div className="chit-studio">
          <ChitCreationMethod modes={modes} selectedMode={mode} onSelect={setMode} />
          {mode === "AI_DESIGN" && <BeginnerDesigner value={basic} onChange={setBasic} onGenerate={generatePlans} />}
          {mode === "IMPORT_EXISTING_PLAN" && <SmartCaptureUploader activeTenantContext={activeTenantContext} />}
          {mode === "USE_SAVED_TEMPLATE" && <TemplateLibrary templates={templates} onUseTemplate={(template) => { setRuleSet(template.ruleSet); setSchedule(template.schedule); setBasic((current) => ({ ...current, chitName: template.name })); }} />}
          {mode === "ADVANCED_MANUAL_DESIGNER" && <div className="chit-studio-info">Advanced mode is active. Edit rules and month-wise rows below before confirming.</div>}
          <OrganizerMemoryPanel activeTenantContext={activeTenantContext} onApply={(preference) => setRuleSet((current) => ({ ...current, [preference.key]: preference.value }))} />
          <PlanComparison proposals={proposals} selectedProposalId={selectedProposalId} onSelect={selectProposal} />
          <RuleEditor ruleSet={ruleSet} onChange={setRuleSet} />
          <ScheduleEditor schedule={schedule} onChange={setSchedule} />
          <SimulationPanel simulation={simulation} />
          <FinalChitPreview basic={basic} validation={validation} onCreate={createGroup} onSaveTemplate={saveTemplate} />
          {message && <div className="chit-studio-message">{message}</div>}
        </div>
      </Modal>
    </>
  );
}

export default ChitStudioLauncher;
