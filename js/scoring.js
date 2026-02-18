// ============================================================
// 猫の健康管理OS - Scoring Engine
// ============================================================

const Scoring = {
    // ── W_risk Calculation (Max Rule) ──
    calculateWRisk(cat) {
        const ageYears = Utils.calculateAge(cat);
        const ageRisk = this.getAgeRisk(ageYears);
        const infectionRisk = this.getInfectionRisk(cat);
        const chronicRisk = this.getChronicRisk(cat);
        return Math.max(ageRisk, infectionRisk, chronicRisk);
    },

    getAgeRisk(ageYears) {
        if (ageYears === null || ageYears === undefined) return 1.0;
        if (ageYears <= 9) return 1.0;
        if (ageYears <= 12) return 1.3;
        return 1.5;
    },

    getInfectionRisk(cat) {
        const fivRisk = cat.fiv_status === 'positive' ? 1.3 : 1.0;
        const felvRisk = cat.felv_status === 'positive' ? 1.5 : 1.0;
        return Math.max(fivRisk, felvRisk);
    },

    getChronicRisk(cat) {
        if (!cat.chronic_conditions || cat.chronic_conditions.length === 0) return 1.0;
        const severityMap = { mild: 1.3, moderate: 1.5, severe: 1.8 };
        const risks = cat.chronic_conditions.map(c => severityMap[c.severity_level] || 1.0);
        return Math.max(...risks);
    },

    // ── W_risk Breakdown (for UI display) ──
    getWRiskBreakdown(cat) {
        const ageYears = Utils.calculateAge(cat);
        const ageRisk = this.getAgeRisk(ageYears);
        const infectionRisk = this.getInfectionRisk(cat);
        const chronicRisk = this.getChronicRisk(cat);
        const wRisk = Math.max(ageRisk, infectionRisk, chronicRisk);

        return {
            age: { value: ageRisk, years: ageYears, isMax: ageRisk === wRisk },
            infection: { value: infectionRisk, isMax: infectionRisk === wRisk },
            chronic: { value: chronicRisk, isMax: chronicRisk === wRisk },
            final: wRisk
        };
    },

    // ── S_calc / S_final Calculation ──
    calculateScore(cat) {
        // Skip for trial/adopted cats
        if (cat.status === 'trial' || cat.status === 'adopted') {
            return { S_calc: null, S_final: null, W_risk: null, penalties: {}, active_sos: null };
        }

        const wRisk = this.calculateWRisk(cat);
        const latestRecord = Store.getLatestRecord(cat.id);
        const latestWeight = Store.getLatestWeight(cat.id);

        let totalVisualPenalty = 0;
        let totalSOSPenalty = 0;
        let totalTaskPenalty = 0;
        let activeSOSLevel = null;

        // Visual scores penalty
        if (latestRecord?.visual_scores) {
            totalVisualPenalty = latestRecord.visual_scores.reduce((sum, vs) => sum + (vs.penalty || 0), 0);
        }

        // SOS penalty
        if (latestRecord?.sos_level) {
            activeSOSLevel = latestRecord.sos_level;
            if (latestRecord.sos_level === 1) totalSOSPenalty = 20;
            else if (latestRecord.sos_level === 2) totalSOSPenalty = 50;
            else if (latestRecord.sos_level === 3) totalSOSPenalty = 50; // Lv.3 also -50, but cap at 20 later
        }

        // Weight unmeasured task penalty
        if (latestWeight) {
            const daysSince = Utils.daysSince(latestWeight.timestamp);
            if (daysSince >= 8) {
                totalTaskPenalty += 10; // P_weight_unmeasured
            }
        } else {
            // Never measured
            totalTaskPenalty += 10;
        }

        // Floor incident observation priority
        const activeIncidents = Store.getActiveIncidents();
        const catIncidents = activeIncidents.filter(
            i => i.suspected_cat_ids && i.suspected_cat_ids.includes(cat.id)
        );
        // Add observation penalty if in active incident
        if (catIncidents.length > 0) {
            // observation_priority = +1 per incident (adding minor penalty for UI visibility)
            totalTaskPenalty += catIncidents.length * 5;
        }

        // S_calc
        let S_calc = 100 - (totalVisualPenalty * wRisk) - totalSOSPenalty - totalTaskPenalty;
        S_calc = Math.max(S_calc, 0);

        // S_final
        let S_final = S_calc;
        if (activeSOSLevel === 3) {
            S_final = Math.min(S_calc, 20);
        }

        return {
            S_calc: Math.round(S_calc),
            S_final: Math.round(S_final),
            W_risk: wRisk,
            penalties: {
                visual: totalVisualPenalty,
                visual_weighted: Math.round(totalVisualPenalty * wRisk * 10) / 10,
                sos: totalSOSPenalty,
                task: totalTaskPenalty
            },
            active_sos: activeSOSLevel
        };
    },

    // ── Calculate for all cats ──
    calculateAllScores() {
        const cats = Store.getCats();
        return cats.map(cat => ({
            cat,
            score: this.calculateScore(cat)
        })).sort((a, b) => {
            // null scores (trial/adopted) go last
            if (a.score.S_final === null && b.score.S_final === null) return 0;
            if (a.score.S_final === null) return 1;
            if (b.score.S_final === null) return -1;
            return a.score.S_final - b.score.S_final; // lowest first (priority)
        });
    }
};
