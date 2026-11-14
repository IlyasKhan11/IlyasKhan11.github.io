import { HERO_MODELS } from './hero-models.js';
import { PROJECT_MODELS } from './project-models.js';
import { SECTION_MODELS } from './section-models.js';

/**
 * Every model, looked up by id. In the HTML, a 3D slot asks for models by id:
 *   <div data-voxel-models="knight,robot,terminal"></div>
 */
export const MODEL_LIBRARY = { ...HERO_MODELS, ...PROJECT_MODELS, ...SECTION_MODELS };
