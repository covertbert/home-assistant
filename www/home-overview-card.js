/* Home-specific Overview dashboard. No build step or dependencies.
   Shares the design system of heating-control-card.js. */
const CHIPS = [
  { entity: "input_boolean.home_state", name: "Home", type: "toggle" },
  { entity: "person.bertie", name: "Bert", type: "more-info" },
  { entity: "person.stoof", name: "Stoof", type: "more-info" },
  {
    entity: "input_boolean.housesitter_present",
    name: "Sitter",
    type: "toggle",
    show_if: { entity: "person.housesitter", state: "home" },
  },
  {
    entity: "input_boolean.housesitter_present",
    name: "Sitter Toggle",
    icon: "mdi:toggle-switch-outline",
    type: "toggle",
  },
  {
    entity:
      "sensor.octopus_energy_electricity_22l3444132_1610012177566_current_rate",
    name: "Electricity rate",
    type: "more-info",
  },
  {
    entity:
      "sensor.octopus_energy_electricity_22l3444132_1610012177566_current_accumulative_consumption",
    name: "Electricity use",
    type: "more-info",
  },
  {
    entity:
      "sensor.octopus_energy_gas_e6s16281722261_1603596609_current_accumulative_consumption_kwh",
    name: "Gas use",
    type: "more-info",
  },
  { entity: "sensor.speedtest_download", name: "Download", type: "more-info" },
  {
    entity: "input_boolean.cheap_electricity",
    name: "Cheap electricity",
    type: "more-info",
    show_if: { entity: "input_boolean.cheap_electricity", state: "on" },
  },
  {
    entity: "switch.dishwasher_power",
    name: "Dishwasher",
    type: "more-info",
    show_if: { entity: "switch.dishwasher_power", state: "on" },
  },
];

const ALERTS = [
  {
    entity: "switch.dehumidifier_bedroom_switch",
    name: "Bedroom dehumidifier",
    show_if: { entity: "switch.dehumidifier_bedroom_switch", state: "on" },
  },
  {
    entity: "switch.dehumidifier_basement_switch",
    name: "Basement dehumidifier",
    show_if: { entity: "switch.dehumidifier_basement_switch", state: "on" },
  },
  {
    entity: "binary_sensor.study_window_opening",
    name: "Study window open",
    show_if: { entity: "binary_sensor.nursery_window_opening", state: "on" },
  },
  {
    entity: "binary_sensor.landing_window_opening",
    name: "Landing window open",
    show_if: { entity: "binary_sensor.landing_window_opening", state: "on" },
  },
  {
    entity: "binary_sensor.living_room_window_opening",
    name: "Living Room window open",
    show_if: {
      entity: "binary_sensor.living_room_window_opening",
      state: "on",
    },
  },
  {
    entity: "binary_sensor.bedroom_window_opening",
    name: "Bedroom window open",
    show_if: { entity: "binary_sensor.bedroom_window_opening", state: "on" },
  },
];

const ROOM_MAP = [
  {
    id: "attic",
    label: "Attic",
    icon: "mdi:home-roof",
    path: "/dashboard-sandbox/0",
    climate: "climate.attic",
    entities: [
      {
        entity: "switch.attic_workstation_switch",
        type: "more-info",
        name: "Workstation",
      },
    ],
  },
  {
    id: "basement",
    label: "Basement",
    icon: "mdi:washing-machine",
    path: "/dashboard-sandbox/2",
    climate: "climate.basement",
    entities: [
      {
        entity: "switch.dehumidifier_basement_switch",
        type: "switch",
        name: "Dehumidifier",
        icon: "mdi:air-humidifier",
      },
    ],
  },
  {
    id: "bathroom",
    label: "Bathroom",
    icon: "mdi:shower",
    path: "/dashboard-sandbox/1",
    climate: "climate.bathroom",
    entities: [],
  },
  {
    id: "bedroom",
    label: "Bedroom",
    icon: "mdi:bed-king",
    path: "/dashboard-sandbox/3",
    climate: "climate.bedroom",
    entities: [
      { entity: "light.bedroom", type: "light", icon: "mdi:lamps" },
      { entity: "light.stoof", type: "light" },
      {
        entity: "binary_sensor.bedroom_window_opening",
        type: "more-info",
        name: "Window",
        show_if: {
          entity: "binary_sensor.bedroom_window_opening",
          state: "on",
        },
      },
    ],
  },
  {
    id: "hallway",
    label: "Hallway",
    icon: "mdi:coat-rack",
    path: "/dashboard-sandbox/4",
    climate: "climate.downstairs",
    entities: [],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    icon: "mdi:countertop",
    path: "/dashboard-sandbox/5",
    climate: "climate.kitchen",
    entities: [
      {
        entity: "switch.dishwasher_power",
        type: "more-info",
        name: "Dishwasher",
      },
      {
        entity: "sensor.dishwasher_operation_state",
        type: "more-info",
        name: "Dishwasher state",
        show_if: {
          entity: "sensor.dishwasher_operation_state",
          state_not: "Ready",
        },
      },
      {
        entity: "binary_sensor.dishwasher_door",
        type: "more-info",
        show_if: { entity: "binary_sensor.dishwasher_door", state: "Open" },
      },
      {
        entity: "sensor.dishwasher_remaining_program_time",
        type: "more-info",
        name: "Dishwasher remaining",
        show_if: {
          entity: "sensor.dishwasher_remaining_program_time",
          state_not: "unavailable",
        },
      },
      {
        entity: "sensor.dishwasher_program_progress",
        type: "more-info",
        name: "Dishwasher progress",
        show_if: {
          entity: "sensor.dishwasher_program_progress",
          state_not_any: ["unavailable", "0%"],
        },
      },
    ],
  },
  {
    id: "landing",
    label: "Landing",
    icon: "mdi:stairs",
    path: "/dashboard-sandbox/6",
    entities: [
      {
        entity: "light.hare",
        type: "light",
        name: "Landing Lamp",
        icon: "mdi:oil-lamp",
        brightness: 255,
      },
    ],
  },
  {
    id: "living_room",
    label: "Living Room",
    icon: "mdi:sofa",
    path: "/dashboard-sandbox/6",
    climate: "climate.living_room",
    entities: [
      { entity: "light.living_room", type: "light", icon: "mdi:lamps" },
      { entity: "light.tv_strip", type: "light", brightness: 255 },
      { entity: "light.back", type: "light", brightness: 255 },
    ],
  },
  {
    id: "nursery",
    label: "Nursery",
    icon: "mdi:cradle",
    path: "/dashboard-sandbox/7",
    climate: "climate.nursery",
    entities: [],
  },
];

function esc(value) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
}
function isUnavailable(state) {
  return !state || ["unavailable", "unknown"].includes(state.state);
}
function stateText(state) {
  return isUnavailable(state) ? "Unavailable" : state.state;
}
function temp(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n % 1 ? n.toFixed(1) : n}°` : "—";
}
function condMet(state, cond) {
  if (!cond) return true;
  const value = state?.state;
  if (cond.state !== undefined) return value === cond.state;
  if (cond.state_not !== undefined) return value !== cond.state_not;
  if (cond.state_not_any !== undefined)
    return !cond.state_not_any.includes(value);
  return true;
}
function friendly(state, entity, fallback) {
  return (
    fallback ||
    state?.attributes?.friendly_name ||
    entity.split(".").pop().replace(/_/g, " ")
  );
}

function selfTest() {
  console.assert(
    temp(19) === "19°" && temp(19.5) === "19.5°" && temp("x") === "—",
  );
  console.assert(condMet({ state: "on" }, { state: "on" }));
  console.assert(!condMet({ state: "off" }, { state: "on" }));
  console.assert(condMet({ state: "Ready" }, { state_not: "Busy" }));
  console.assert(
    !condMet({ state: "0%" }, { state_not_any: ["unavailable", "0%"] }),
  );
  console.assert(condMet(undefined, undefined));
  console.log("home-overview-card self-test passed");
}

if (typeof window === "undefined") {
  if (process.argv.includes("--self-test")) selfTest();
} else {
  class HomeOverviewCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.error = "";
      this._renderQueued = false;
    }
    setConfig(config) {
      this.config = config || {};
    }
    set hass(hass) {
      this._hass = hass;
      this.queueRender();
    }
    getCardSize() {
      return 12;
    }
    static getStubConfig() {
      return {};
    }
    queueRender() {
      if (this._renderQueued) return;
      this._renderQueued = true;
      queueMicrotask(() => {
        this._renderQueued = false;
        this.render();
      });
    }
    get state() {
      return (entity) => this._hass?.states?.[entity];
    }
    get admin() {
      return Boolean(this._hass?.user?.is_admin);
    }
    visible(item) {
      return condMet(this.state(item.show_if?.entity), item.show_if);
    }
    render() {
      if (!this._hass) return;
      const rooms = ROOM_MAP.map((room) => this.roomHtml(room)).join("");
      const errors = this.error
        ? `<div class="notice error" role="alert">${esc(this.error)}</div>`
        : "";
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style><ha-card><main><header class="general">${this.generalHtml()}</header>${errors}<section class="rooms" aria-label="Rooms">${rooms}</section></main></ha-card>`;
      this.bind();
    }
    generalHtml() {
      const home = this.state("input_boolean.home_state"),
        climates = ROOM_MAP.map((room) => this.state(room.climate)).filter(
          Boolean,
        );
      const counts = { heating: 0, idle: 0, off: 0, unavailable: 0 };
      for (const item of climates) {
        if (isUnavailable(item)) counts.unavailable++;
        else if (item.state === "off") counts.off++;
        else if (item.attributes?.hvac_action === "heating") counts.heating++;
        else counts.idle++;
      }
      const chips = CHIPS.filter((chip) => this.visible(chip))
        .map((chip) => this.chipHtml(chip))
        .join("");
      const alerts = ALERTS.filter((alert) => this.visible(alert));
      return `<div class="general-title"><div><p class="eyebrow">HOME</p><h1>Overview</h1><p class="presence"><ha-icon icon="${home?.state === "on" ? "mdi:home-account" : "mdi:home-export-outline"}"></ha-icon>${home?.state === "on" ? "Home" : "Away"}</p></div><div class="summary"><b>${counts.heating}</b> heating <b>${counts.idle}</b> idle${counts.off ? ` <b>${counts.off}</b> off` : ""}${counts.unavailable ? ` <b>${counts.unavailable}</b> unavailable` : ""}</div></div><div class="chips">${chips}</div>${alerts.length ? `<aside class="exceptions"><b>Needs attention</b>${alerts.map((alert) => `<button data-action="more-info" data-entity="${alert.entity}"><ha-icon icon="mdi:alert-circle-outline"></ha-icon>${esc(friendly(this.state(alert.entity), alert.entity, alert.name))}</button>`).join("")}</aside>` : ""}`;
    }
    chipHtml(chip) {
      const item = this.state(chip.entity),
        name = friendly(item, chip.entity, chip.name),
        value = isUnavailable(item)
          ? "—"
          : item.attributes?.unit_of_measurement
            ? `${item.state} ${item.attributes.unit_of_measurement}`
            : item.state;
      return `<button class="chip" data-action="${chip.type}" data-entity="${chip.entity}" title="${esc(name)}"><ha-icon icon="${esc(chip.icon || item?.attributes?.icon || "mdi:information-outline")}"></ha-icon><span>${esc(name)}</span><b>${esc(value)}</b></button>`;
    }
    roomHtml(room) {
      const climate = room.climate ? this.state(room.climate) : null;
      const rows = room.entities
        .filter((entity) => this.visible(entity))
        .map((entity) => this.entityRow(entity))
        .join("");
      const head = climate
        ? `<button class="temperature" data-action="more-info" data-entity="${room.climate}" aria-label="Open ${room.label} climate details"><strong>${temp(climate?.attributes?.current_temperature)}</strong><span>now · target ${temp(climate?.attributes?.temperature)}</span><small>${esc(climate?.attributes?.hvac_action || stateText(climate))}</small></button>`
        : "";
      const control = climate ? this.climateControl(room.climate, climate) : "";
      const title = room.path
        ? `<button class="room-link" data-action="navigate" data-path="${esc(room.path)}"><h2>${esc(room.label)}</h2></button>`
        : `<h2>${esc(room.label)}</h2>`;
      return `<article class="room ${isUnavailable(climate) && climate ? "unavailable" : ""}" data-room="${room.id}"><div class="room-head"><div class="room-name"><ha-icon icon="${room.icon}"></ha-icon>${title}</div>${head}</div>${control}${rows ? `<footer class="context">${rows}</footer>` : ""}</article>`;
    }
    climateControl(entity, state) {
      const attrs = state?.attributes || {},
        unavailable = isUnavailable(state),
        step = attrs.target_temp_step ?? 0.5,
        min = attrs.min_temp ?? 5,
        max = attrs.max_temp ?? 30;
      return `<label class="number ${unavailable ? "disabled" : ""}"><span>Target</span><div><button data-action="climate" data-entity="${entity}" data-delta="-${step}" data-min="${min}" data-max="${max}" ${unavailable ? "disabled" : ""} aria-label="Lower target">−</button><output>${unavailable ? "—" : temp(attrs.temperature)}</output><button data-action="climate" data-entity="${entity}" data-delta="${step}" data-min="${min}" data-max="${max}" ${unavailable ? "disabled" : ""} aria-label="Raise target">+</button></div></label>`;
    }
    entityRow(entity) {
      const item = this.state(entity.entity),
        name = friendly(item, entity.entity, entity.name),
        icon = entity.icon || item?.attributes?.icon,
        on = item?.state === "on",
        unavailable = isUnavailable(item);
      if (entity.type === "light") {
        const brightness = Number(item?.attributes?.brightness);
        return `<div class="entity-row"><button class="accessory ${on ? "on" : ""}" data-action="entity-toggle" data-entity="${entity.entity}" ${entity.brightness ? `data-brightness="${entity.brightness}"` : ""} ${unavailable ? "disabled" : ""}>${icon ? `<ha-icon icon="${esc(icon)}"></ha-icon>` : ""}${esc(name)} <b>${esc(stateText(item))}</b></button><button class="entity-info" data-action="more-info" data-entity="${entity.entity}" aria-label="Open ${esc(name)} details">ⓘ</button>${Number.isFinite(brightness) ? `<input class="brightness" data-action="brightness" data-entity="${entity.entity}" type="range" min="1" max="255" value="${brightness}" ${unavailable ? "disabled" : ""} aria-label="${esc(name)} brightness">` : ""}</div>`;
      }
      if (entity.type === "switch") {
        return `<button class="accessory ${on ? "on" : ""}" data-action="entity-toggle" data-entity="${entity.entity}" ${unavailable ? "disabled" : ""}>${icon ? `<ha-icon icon="${esc(icon)}"></ha-icon>` : ""}${esc(name)} <b>${esc(stateText(item))}</b></button>`;
      }
      return `<button class="accessory" data-action="more-info" data-entity="${entity.entity}">${icon ? `<ha-icon icon="${esc(icon)}"></ha-icon>` : ""}${esc(name)} <b>${esc(stateText(item))}</b></button>`;
    }
    bind() {
      this.shadowRoot.addEventListener("click", (event) => this.click(event));
      this.shadowRoot.addEventListener("change", (event) => {
        const control = event.target.closest('[data-action="brightness"]');
        if (control) this.changeBrightness(control);
      });
    }
    async click(event) {
      const control = event.target.closest("[data-action]");
      if (!control) return;
      const action = control.dataset.action,
        entity = control.dataset.entity;
      if (action === "navigate")
        return window.location.assign(control.dataset.path);
      if (action === "more-info")
        return this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            detail: { entityId: entity },
            bubbles: true,
            composed: true,
          }),
        );
      if (action === "toggle" || action === "entity-toggle")
        return this.toggle(control);
      if (action === "climate") return this.changeClimate(control);
    }
    async toggle(control) {
      const entity = control.dataset.entity,
        domain = entity.split(".")[0],
        on = this.state(entity)?.state === "on",
        data = { entity_id: entity };
      if (!on && control.dataset.brightness && domain === "light")
        data.brightness = Number(control.dataset.brightness);
      try {
        control.disabled = true;
        await this._hass.callService(domain, on ? "turn_off" : "turn_on", data);
      } catch (error) {
        this.error = `Could not change ${entity}: ${error.message || error}`;
        this.queueRender();
      }
    }
    async changeClimate(control) {
      const entity = control.dataset.entity,
        attrs = this.state(entity)?.attributes || {},
        next = Math.max(
          Number(control.dataset.min),
          Math.min(
            Number(control.dataset.max),
            Number(attrs.temperature) + Number(control.dataset.delta),
          ),
        );
      try {
        control.parentElement.classList.add("pending");
        await this._hass.callService("climate", "set_temperature", {
          entity_id: entity,
          temperature: next,
        });
      } catch (error) {
        this.error = `Could not update ${entity}: ${error.message || error}`;
        this.queueRender();
      }
    }
    async changeBrightness(control) {
      try {
        await this._hass.callService("light", "turn_on", {
          entity_id: control.dataset.entity,
          brightness: Number(control.value),
        });
      } catch (error) {
        this.error = `Could not update ${control.dataset.entity}: ${error.message || error}`;
        this.queueRender();
      }
    }
    styles() {
      return `:host{display:block;color:var(--primary-text-color)}ha-card{background:var(--card-background-color);box-shadow:none}main{padding:clamp(12px,2vw,28px);max-width:1600px;margin:auto}.general{border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,16px);padding:clamp(18px,3vw,30px);background:linear-gradient(135deg,var(--primary-background-color),var(--card-background-color));margin-bottom:20px}.general-title,.room-head{display:flex;justify-content:space-between;gap:16px;align-items:center}.eyebrow{margin:0;color:var(--secondary-text-color);font-size:.72rem;font-weight:700;letter-spacing:.08em}.general h1,.room h2{margin:4px 0}.presence{display:flex;align-items:center;gap:6px;margin:8px 0 0}.summary{color:var(--secondary-text-color)}.summary b{color:var(--primary-text-color);font-size:1.2rem;margin-left:8px}.chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.chip{display:flex;align-items:center;gap:6px;border:1px solid var(--divider-color);border-radius:100px;background:var(--card-background-color);color:var(--primary-text-color);padding:6px 12px;cursor:pointer;font:inherit;font-size:.8rem}.chip ha-icon{--mdc-icon-size:18px;color:var(--primary-color)}.chip b{color:var(--secondary-text-color);font-weight:700}.exceptions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:18px;color:var(--secondary-text-color)}.exceptions b{width:100%;color:var(--primary-text-color)}.exceptions button{display:flex;align-items:center;gap:5px;border:0;border-left:3px solid var(--error-color);border-radius:0;background:none;color:var(--primary-text-color);padding:2px 8px;cursor:pointer;font:inherit;font-size:.8rem}.exceptions ha-icon{--mdc-icon-size:18px;color:var(--error-color)}.rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:16px}.room{border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,16px);padding:18px;background:var(--card-background-color);min-width:0}.room.unavailable{opacity:.75}.room-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.room-name ha-icon{color:var(--primary-color)}.room-link{border:0;background:none;color:inherit;padding:0;cursor:pointer;font:inherit;text-align:left}.room-link h2{margin:4px 0}.temperature{background:none;border:0;color:inherit;text-align:right;padding:0;cursor:pointer}.temperature strong{display:block;font-size:2rem;line-height:1}.temperature span,.temperature small{display:block;color:var(--secondary-text-color);font-size:.75rem;margin-top:4px}.number{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.8rem;margin-top:14px}.number div{display:flex;align-items:center;border:1px solid var(--divider-color);border-radius:7px;overflow:hidden}.number button{border:0;background:var(--secondary-background-color);color:var(--primary-text-color);font-size:1.1rem;width:28px;height:30px;cursor:pointer}.number output{min-width:38px;text-align:center;font-weight:700}.number.disabled{opacity:.55}.number.pending{opacity:.6}.context{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-top:1px solid var(--divider-color);margin-top:14px;padding-top:12px;font-size:.78rem;color:var(--secondary-text-color)}.entity-row{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.accessory{display:flex;align-items:center;gap:5px;border:1px solid var(--divider-color);border-radius:7px;background:var(--secondary-background-color);color:var(--primary-text-color);padding:6px 8px;cursor:pointer;font:inherit;font-size:.78rem}.entity-info{border:0;background:none;color:var(--secondary-text-color);padding:5px;cursor:pointer;font-size:1rem}.brightness{width:100%;accent-color:var(--primary-color);cursor:pointer}.accessory ha-icon{--mdc-icon-size:18px}.accessory.on{border-color:var(--primary-color);color:var(--primary-color)}.accessory.on ha-icon{color:var(--primary-color)}.accessory:disabled{opacity:.55;cursor:not-allowed}.accessory b{color:var(--secondary-text-color)}.accessory.on b{color:var(--primary-color)}.notice{grid-column:1/-1;padding:12px;border-radius:8px;background:var(--secondary-background-color)}.notice.error{color:var(--error-color)}@media(max-width:640px){main{padding:10px}.general-title,.room-head{align-items:flex-start;flex-direction:column}.temperature{text-align:left}}`;
    }
  }
  customElements.define("home-overview-card", HomeOverviewCard);
}
