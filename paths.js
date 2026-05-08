// Resolves where iStdBMAD installs BMAD skills.
// Stable location so `npx istd-bmad start` and `npx istd-bmad setup` agree.
// Override with the ISTD_BMAD_HOME env var if you want skills somewhere else.

import { homedir } from 'node:os';
import { join } from 'node:path';

export const INSTALL_DIR = process.env.ISTD_BMAD_HOME || join(homedir(), '.istd-bmad');
export const SKILLS_DIR = join(INSTALL_DIR, '.claude', 'skills');
