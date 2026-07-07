export interface RetryPolicy {
  ErrorEquals?: string[]
  IntervalSeconds?: number
  MaxAttempts?: number
  BackoffRate?: number
  JitterSeconds?: number
  MaxDelaySeconds?: number
  IntervalSecondsPath?: string
  MaxAttemptsPath?: string
  BackoffRatePath?: string
}

export interface CatchPolicy {
  ErrorEquals?: string[]
  Next?: string
  ResultPath?: string
}

export interface ChoiceRule {
  Variable?: string
  StringEquals?: string
  StringLessThanEquals?: string
  StringGreaterThanEquals?: string
  StringMatches?: string
  NumericEquals?: number
  NumericGreaterThan?: number
  NumericLessThan?: number
  NumericLessThanEquals?: number
  NumericGreaterThanEquals?: number
  BooleanEquals?: boolean
  IsPresent?: boolean
  IsNull?: boolean
  IsString?: boolean
  IsNumeric?: boolean
  IsBoolean?: boolean
  IsTimestamp?: boolean
  Next?: string
}

export interface CommonState {
  Type: string
  Comment?: string
  InputPath?: string
  OutputPath?: string
  ResultPath?: string
  Parameters?: unknown
  Retry?: RetryPolicy[]
  Catch?: CatchPolicy[]
  TimeoutSeconds?: number
  ResultSelector?: unknown
}

export interface TaskState extends CommonState {
  Type: 'Task'
  Resource?: string
  Code?: string
  Next?: string
  End?: boolean
  WaitForTaskToken?: boolean
  ActivityName?: string
  HeartbeatSeconds?: number
}

export interface HttpState extends CommonState {
  Type: 'Http'
  Url?: string
  Method?: string
  Headers?: Record<string, unknown>
  Body?: unknown
  Next?: string
  End?: boolean
}

export interface PassState extends CommonState {
  Type: 'Pass'
  Result?: unknown
  Next?: string
  End?: boolean
}

export interface WaitState extends CommonState {
  Type: 'Wait'
  Seconds?: number
  SecondsPath?: string
  Timestamp?: string
  TimestampPath?: string
  Next?: string
  End?: boolean
}

export interface ChoiceState extends CommonState {
  Type: 'Choice'
  Choices?: ChoiceRule[]
  Default?: string
}

export interface ParallelState extends CommonState {
  Type: 'Parallel'
  Branches?: StateMachineDefinition[]
  Next?: string
  End?: boolean
}

export interface MapState extends CommonState {
  Type: 'Map'
  Iterator?: StateMachineDefinition
  ItemsPath?: string
  ItemSelector?: unknown
  MaxConcurrency?: number
  ToleratedFailurePercentage?: number
  Next?: string
  End?: boolean
}

export interface SucceedState extends CommonState {
  Type: 'Succeed'
}

export interface FailState extends CommonState {
  Type: 'Fail'
  Error?: string
  Cause?: string
}

export interface StartExecutionState extends CommonState {
  Type: 'StartExecution'
  StateMachineName?: string
  Input?: unknown
  RunMode?: 'sync' | 'async'
  Next?: string
  End?: boolean
}

export type OsmlState =
  | TaskState
  | HttpState
  | PassState
  | WaitState
  | ChoiceState
  | ParallelState
  | MapState
  | SucceedState
  | FailState
  | StartExecutionState

export interface StateMachineDefinition {
  Comment?: string
  StartAt: string
  TimeoutSeconds?: number
  QueryLanguage?: 'JSONPath' | 'JSONata'
  States: Record<string, OsmlState>
}

export const STATE_TYPES = [
  'Task',
  'Http',
  'Pass',
  'Wait',
  'Choice',
  'Parallel',
  'Map',
  'Succeed',
  'Fail',
  'StartExecution',
] as const

export function createDefaultState(type: string): OsmlState {
  switch (type) {
    case 'Task':
      return { Type: 'Task', Resource: 'js', Code: 'return input;', End: true }
    case 'Http':
      return { Type: 'Http', Url: 'https://api.example.com', Method: 'GET', End: true }
    case 'Pass':
      return { Type: 'Pass', End: true }
    case 'Wait':
      return { Type: 'Wait', Seconds: 1, End: true }
    case 'Choice':
      return { Type: 'Choice', Choices: [] }
    case 'Parallel':
      return {
        Type: 'Parallel',
        Branches: [{ StartAt: 'BranchStart', States: { BranchStart: { Type: 'Pass', End: true } } }],
        End: true,
      }
    case 'Map':
      return {
        Type: 'Map',
        Iterator: { StartAt: 'ItemStart', States: { ItemStart: { Type: 'Pass', End: true } } },
        End: true,
      }
    case 'Succeed':
      return { Type: 'Succeed' }
    case 'Fail':
      return { Type: 'Fail', Error: 'States.ALL', Cause: 'Failed' }
    case 'StartExecution':
      return { Type: 'StartExecution', StateMachineName: '', RunMode: 'async', End: true }
    default:
      return { Type: 'Pass', End: true }
  }
}

export type MachineTemplateType = 'empty' | 'linear' | 'task' | 'choice' | 'wait' | 'parallel' | 'map' | 'order-fulfillment'

export type WorkflowType = 'STANDARD' | 'EXPRESS'

export const MACHINE_TEMPLATES: {
  id: MachineTemplateType
  label: string
  description: string
}[] = [
  {
    id: 'empty',
    label: 'Empty',
    description: 'A single state — start completely from scratch.',
  },
  {
    id: 'linear',
    label: 'Linear',
    description: 'Pass step → success. Simple pipeline to extend.',
  },
  {
    id: 'task',
    label: 'Task',
    description: 'JavaScript task as the first step.',
  },
  {
    id: 'choice',
    label: 'Choice',
    description: 'Branch on input with a Choice state.',
  },
  {
    id: 'wait',
    label: 'Wait',
    description: 'Timed delay before completing.',
  },
  {
    id: 'parallel',
    label: 'Parallel',
    description: 'Run branches concurrently, then finish.',
  },
  {
    id: 'map',
    label: 'Map',
    description: 'Iterate over an array with a nested iterator.',
  },
  {
    id: 'order-fulfillment',
    label: 'Order fulfillment',
    description: 'Complex pipeline: JS validate → Choice → Parallel → Map → summarize.',
  },
]

export interface CreateMachineDraft {
  name: string
  template: MachineTemplateType
  workflowType: WorkflowType
}

const terminalDone = { Type: 'Succeed' as const }

export function createDefinitionFromTemplate(template: MachineTemplateType): StateMachineDefinition {
  switch (template) {
    case 'task':
      return {
        StartAt: 'Step1',
        States: {
          Step1: {
            Type: 'Task',
            Resource: 'js',
            Code: 'return input;',
            Comment: 'First task — edit code or add more states',
            Next: 'Done',
          },
          Done: terminalDone,
        },
      }
    case 'choice':
      return {
        StartAt: 'Step1',
        States: {
          Step1: {
            Type: 'Choice',
            Choices: [{ Variable: '$.status', StringEquals: 'ok', Next: 'Done' }],
            Default: 'Done',
          },
          Done: terminalDone,
        },
      }
    case 'wait':
      return {
        StartAt: 'Step1',
        States: {
          Step1: { Type: 'Wait', Seconds: 5, Next: 'Done' },
          Done: terminalDone,
        },
      }
    case 'parallel':
      return {
        StartAt: 'Step1',
        States: {
          Step1: {
            Type: 'Parallel',
            Branches: [
              {
                StartAt: 'BranchA',
                States: { BranchA: { Type: 'Pass', End: true } },
              },
              {
                StartAt: 'BranchB',
                States: { BranchB: { Type: 'Pass', End: true } },
              },
            ],
            Next: 'Done',
          },
          Done: terminalDone,
        },
      }
    case 'map':
      return {
        StartAt: 'Step1',
        States: {
          Step1: {
            Type: 'Map',
            ItemsPath: '$.items',
            Iterator: {
              StartAt: 'ProcessItem',
              States: { ProcessItem: { Type: 'Pass', End: true } },
            },
            Next: 'Done',
          },
          Done: terminalDone,
        },
      }
    case 'order-fulfillment':
      return createOrderFulfillmentDefinition()
    case 'empty':
      return createBlankDefinition()
    case 'linear':
    default:
      return createEmptyDefinition()
  }
}

/** Truly minimal starting point: one state you can build from scratch. */
export function createBlankDefinition(): StateMachineDefinition {
  return {
    StartAt: 'Start',
    States: {
      Start: {
        Type: 'Pass',
        End: true,
      },
    },
  }
}

export function createEmptyDefinition(): StateMachineDefinition {
  return {
    StartAt: 'Step1',
    States: {
      Step1: {
        Type: 'Pass',
        Comment: 'First step — add your workflow logic here',
        Next: 'Done',
      },
      Done: {
        Type: 'Succeed',
      },
    },
  }
}

/** AWS-style order pipeline sample — validate, route, parallel, map, summarize. */
export function createOrderFulfillmentDefinition(): StateMachineDefinition {
  return {
    Comment: 'Order fulfillment — validate, route by value, parallel enrich, map line items, summarize',
    StartAt: 'ValidateOrder',
    TimeoutSeconds: 120,
    States: {
      ValidateOrder: {
        Type: 'Task',
        Resource: 'js',
        Comment: 'Validate structure and compute order total',
        Code: "if (!input.orderId || !input.lines || !input.lines.length) { throw new Error('Invalid order'); } var total = input.lines.reduce(function(s, l) { return s + l.qty * l.price; }, 0); return { orderId: input.orderId, lines: input.lines, total: Math.round(total * 100) / 100, priority: input.priority || 'standard' };",
        ResultPath: '$.order',
        Retry: [{ ErrorEquals: ['States.TaskFailed'], IntervalSeconds: 1, MaxAttempts: 2, BackoffRate: 2.0 }],
        Catch: [{ ErrorEquals: ['States.ALL'], ResultPath: '$.errorInfo', Next: 'ValidationFailed' }],
        Next: 'RouteByValue',
      },
      RouteByValue: {
        Type: 'Choice',
        Comment: 'Premium tier for high-value orders',
        Choices: [{ Variable: '$.order.total', NumericGreaterThan: 500, Next: 'PremiumTier' }],
        Default: 'StandardTier',
      },
      PremiumTier: {
        Type: 'Pass',
        Result: { tier: 'premium', discount: 0.1 },
        ResultPath: '$.pricing',
        Next: 'EnrichInParallel',
      },
      StandardTier: {
        Type: 'Pass',
        Result: { tier: 'standard', discount: 0 },
        ResultPath: '$.pricing',
        Next: 'EnrichInParallel',
      },
      EnrichInParallel: {
        Type: 'Parallel',
        Comment: 'Tax calculation and fraud scoring run concurrently',
        Branches: [
          {
            StartAt: 'CalcTax',
            States: {
              CalcTax: {
                Type: 'Task',
                Resource: 'js',
                Code: 'var total = input.order.total; return { tax: Math.round(total * 0.08 * 100) / 100 };',
                End: true,
              },
            },
          },
          {
            StartAt: 'FraudCheck',
            States: {
              FraudCheck: {
                Type: 'Task',
                Resource: 'js',
                Code: 'var total = input.order.total; return { score: total > 500 ? 0.25 : 0.05, passed: true };',
                End: true,
              },
            },
          },
        ],
        ResultPath: '$.enrichment',
        Next: 'ProcessLineItems',
      },
      ProcessLineItems: {
        Type: 'Map',
        Comment: 'Process each line item with bounded concurrency',
        ItemsPath: '$.order.lines',
        MaxConcurrency: 2,
        Iterator: {
          StartAt: 'ProcessItem',
          States: {
            ProcessItem: {
              Type: 'Task',
              Resource: 'js',
              Code: 'return { sku: input.sku, qty: input.qty, lineTotal: Math.round(input.qty * input.price * 100) / 100, processed: true };',
              End: true,
            },
          },
        },
        ResultPath: '$.processedLines',
        Next: 'Summarize',
      },
      Summarize: {
        Type: 'Task',
        Resource: 'js',
        Comment: 'Build final fulfillment summary',
        Code: "var lines = input.processedLines || []; var subtotal = lines.reduce(function(s, l) { return s + (l.lineTotal || 0); }, 0); var tax = (input.enrichment && input.enrichment[0] && input.enrichment[0].tax) || 0; var fraud = (input.enrichment && input.enrichment[1] && input.enrichment[1].score) || 0; return { orderId: input.order.orderId, tier: input.pricing.tier, discount: input.pricing.discount, subtotal: subtotal, tax: tax, fraudScore: fraud, itemCount: lines.length, status: 'READY_TO_SHIP' };",
        Next: 'Done',
      },
      Done: { Type: 'Succeed' },
      ValidationFailed: {
        Type: 'Fail',
        Error: 'ValidationError',
        Cause: 'Order validation failed — check orderId and lines',
      },
    },
  }
}
