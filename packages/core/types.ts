export type Side = 'BUY'|'SELL'|'HOLD';
export type SceneState = 'IDLE'|'RESEARCHING'|'PITCHING'|'ON_PHONE'|'ELATED'|'DESPAIR'|'EMPTY';
export type Traits={risk:number;contrarianism:number;focus:string;temperament:string;horizon:string;verbosity:number};
export type Forecast={id:number;at:number;due:number;spot:number;target:number;benchmarkSpot:number;actual?:number;hit?:boolean;error?:number;excess?:number};
export type Pitch={id:number;at:number;side:Side;conviction:number;usd:number;thesis:string;bark:string;decision:string;reason:string;forecast:Forecast;violations:string[]};
export type Desk={id:string;symbol:string;name:string;color:string;seed:number;price:number;reference:number;change:number;qty:number;cost:number;realized:number;ordersToday:number;lastOrder:number;lastThink:number;lastThinkPrice:number;state:SceneState;traits:Traits;pitches:Pitch[];forecasts:Forecast[];hiredSession:number;parentId?:string;analystId:string;score:number};
export type FloorEvent={id:number;at:number;kind:string;deskId?:string;text:string};
export type Ticket={id:number;at:number;deskId:string;symbol:string;side:'BUY'|'SELL';usd:number;price:number;qty:number;paper:boolean;signature:string|null};
export type Snapshot={mode:'demo'|'live'|'shadow';treasury?:{wallet:string;sol:number;availableSol:number;netFundingUsd:number;pnlUsd:number;updatedAt:number;status:string;pendingSignature?:string};connected:boolean;session:number;now:number;marketOpen:boolean;paused:boolean;killed:boolean;cash:number;nav:number;openNav:number;turnover:number;benchmarkOpen:number;desks:Desk[];events:FloorEvent[];tickets:Ticket[];curve:{at:number;nav:number}[];archive:Desk[]};

