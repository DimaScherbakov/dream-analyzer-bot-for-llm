import {SessionManager} from "./services/session-manager";
import {Session} from "./types/session.interface";

export class User {

    constructor(
        public id: number,
        private sessionManager: SessionManager
    ) {}

    async getDialogSession() {
        return this.sessionManager.getSession(this.id);
    }

    async setDialogSession(sessionData: Session) {
        await this.sessionManager.setSession(this.id, sessionData);
    }

    async updateDialogSession(updates: Partial<Session>) {
        await this.sessionManager.updateSessionState(this.id, updates);
    }

    async hasAIPermission(): Promise<boolean> {
        if(!(this.id === 0 || this.id)) return false;
        const session = await this.sessionManager.getSession(this.id);
        const {countAIRequests = 0} = session;
        const aiRequestLimit = process.env.AI_REQUEST_LIMIT ? parseInt(process.env.AI_REQUEST_LIMIT) : 1;
        return countAIRequests < aiRequestLimit;
    }

    // ???
    addAnswer(answer: string): Promise<Session> {
        return this.sessionManager.addAnswer(this.id, answer);
    }

    async closeDialogSession() {
        await this.sessionManager.close();
    }
}
