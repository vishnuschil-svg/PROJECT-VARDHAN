import { MemberStateEngine } from "./MemberStateEngine.js";
import { RuleEngine } from "./RuleEngine.js";

export const WinnerEligibilityEngine = {
  getEligibleMembers({ members = [], group = {}, auctions = [], winnerHistory = [], ruleSet = {} } = {}) {
    return members
      .filter((member) => belongsToGroup(member, group.id))
      .map((member) => {
        const memberAuctions = auctions.filter((auction) =>
          (auction.winner_member_id || auction.memberId || auction.member_id) === member.id
        );
        const state = MemberStateEngine.buildState({ member, group, auctions: memberAuctions, ruleSet });
        const lockCheck = RuleEngine.canMemberWin({ memberState: state, ruleSet });
        const alreadyWon = winnerHistory.some((winner) =>
          winner.memberId === member.id &&
          winner.groupId === group.id &&
          String(winner.status || "").toUpperCase() !== "CANCELLED"
        );
        const inactive = ["inactive", "replaced", "defaulted"].includes(String(member.status || "active").toLowerCase());
        return {
          member,
          state,
          eligible: !inactive && !alreadyWon && lockCheck.eligible,
          reason: inactive ? "Member is inactive/replaced/defaulted." : alreadyWon ? "Member already has a confirmed winner record." : lockCheck.reason,
        };
      })
      .filter((item) => item.eligible)
      .map((item) => ({ ...item.member, memberState: item.state }));
  },
};

function belongsToGroup(member, groupId) {
  return !groupId || [member.group_id, member.chit_group_id, member.groupId].includes(groupId);
}
