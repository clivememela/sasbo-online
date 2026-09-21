import { acbRunService } from '../services/acbRunService'
import { bankService } from '../services/bankService'
import { debounceService } from '../services/debounceService'
import { jobGradeService } from '../services/jobGradeService'
import { locationService } from '../services/locationService'
import { memberService } from '../services/memberService'
import { recruiterService } from '../services/recruiterService'
import { recruitmentChannelService } from '../services/recruitmentChannelService'
import { subscriptionsService } from '../services/subscriptionsService'
import * as api from '../services/api'

/**
 * Every service module, and every method on it, DISCOVERED rather than listed.
 *
 * WHY DISCOVERY
 * The error contract is applied by iterating this, not by naming the four
 * services that are wrong today. A tenth service -- or a tenth method on an
 * existing one -- is covered the day it is written, and nobody has to remember
 * to add it to a list. The guard has no list of its own to forget.
 *
 * `api.js` is here as a module but exports no methods that fetch: `apiUrl` is
 * a pure string function and is tested adversarially in its own file.
 */
export const SERVICE_MODULES = [
  { name: 'acbRunService', module: acbRunService },
  { name: 'bankService', module: bankService },
  { name: 'debounceService', module: debounceService },
  { name: 'jobGradeService', module: jobGradeService },
  { name: 'locationService', module: locationService },
  { name: 'memberService', module: memberService },
  { name: 'recruiterService', module: recruiterService },
  { name: 'recruitmentChannelService', module: recruitmentChannelService },
  { name: 'subscriptionsService', module: subscriptionsService },
]

/** The one module that exports no method that performs a request. */
export const PURE_MODULES = [{ name: 'api', module: api }]

/**
 * Arguments to call each method with.
 *
 * These are SYNTHETIC and contain no real member data -- the ID and account
 * numbers here are constructed, and coverage reports and failure output are
 * artefacts that get forwarded.
 *
 * A method with no entry gets the default vector, which is deliberately
 * generous: an id and a small object covers `(id)`, `(data)` and `(id, data)`.
 * Getting the arity wrong is harmless here because the contract asserts what
 * the method does with a RESPONSE, not what it does with its arguments.
 */
const DEFAULT_ARGS = ['7', { name: 'Synthetic', id: '7' }]

const ARGS = {
  'memberService.updateMember': [{ id: '7', surname: 'Synthetic' }],
  'memberService.updateBanking': ['7', { bankAccountNumber: '0000000000' }],
  'memberService.createMember': [{ surname: 'Synthetic', identityNumber: '0000000000000' }],
  'debounceService.useDebounce': ['search', 200],
  'jobGradeService.getByBank': ['ABSA'],
  'locationService.search': [{ bankName: 'Synthetic Bank' }],
  'locationService.getDistricts': ['1'],
  'locationService.getAreas': ['1'],
  'bankService.createBank': [{ bankName: 'Synthetic Bank', branchCode: '000000' }],
  'bankService.updateBank': ['7', { bankName: 'Synthetic Bank' }],
  'acbRunService.prepare': ['2026-10'],
  'acbRunService.cancel': ['7', 3, 'Synthetic reason'],
  'acbRunService.holidayCalendar': [2026],
  'acbRunService.rates': [],
  'acbRunService.unpaids': ['7', null, 0, 50],
  'acbRunService.decide': ['7', '3', 'RE_PRESENT'],
  'acbRunService.heldOver': ['7', 0, 50],
  'acbRunService.permit': ['7', '3', 'Synthetic permission note'],
  'acbRunService.heldLetters': ['7', 0, 50],
  'acbRunService.markHandled': ['7', '21', 'Synthetic handled note'],
  'acbRunService.sendLetter': ['7', '21'],
  'acbRunService.searchMembers': [{ surname: 'Synthetic' }, 0, 25],
}

export const argsFor = (qualifiedName) => ARGS[qualifiedName] ?? DEFAULT_ARGS

/**
 * Every exported function across every service module, flattened.
 * Shape: { service, method, qualified, fn, args }
 */
export function allServiceMethods() {
  return SERVICE_MODULES.flatMap(({ name, module }) =>
    Object.keys(module)
      .filter((key) => typeof module[key] === 'function')
      .map((method) => {
        const qualified = `${name}.${method}`
        return {
          service: name,
          method,
          qualified,
          fn: module[method].bind(module),
          args: argsFor(qualified),
        }
      }),
  )
}

/**
 * Methods that perform no request at all, and so are outside the error
 * contract. Each is asserted to be genuinely request-free rather than simply
 * declared so -- otherwise this list becomes a place to hide a method that is
 * failing the contract.
 */
export const NON_FETCHING = new Set(['bankService.getPageSize', 'memberService.getPageSize'])
