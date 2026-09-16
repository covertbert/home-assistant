/* Home-specific Heating dashboard. No build step or dependencies. */
const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TADO_BRIDGE = {
  power: "switch.tado_bridge_switch",
  cooldown: "timer.tado_bridge_recovery_cooldown",
  unavailable: "sensor.tado_unavailable_climates",
};
const ROOM_MAP = [
  {
    id: "attic",
    label: "Attic",
    icon: "mdi:home-roof",
    climate: "climate.attic",
    target: "sensor.heating_attic_automatic_target",
    timer: "timer.heating_attic_boost",
    fallback: "input_number.heating_attic_default",
    schedules: ["attic_wfh"],
    accessory: {
      entity: "switch.attic_workstation_switch",
      label: "Workstation",
      note: "Automatic: WFH programme also controls workstation.",
    },
  },
  {
    id: "basement",
    label: "Basement",
    icon: "mdi:washing-machine",
    climate: "climate.basement",
    target: "sensor.heating_basement_automatic_target",
    timer: "timer.heating_basement_boost",
    fallback: "input_number.heating_basement_default",
    humidity: "sensor.basement_humidity",
    humidityThreshold: 70,
    humidityTarget: "input_number.heating_basement_high_humidity",
    accessory: {
      entity: "switch.dehumidifier_basement_switch",
      label: "Dehumidifier",
      note: "Automatic: cheap-electricity rule may change this.",
    },
  },
  {
    id: "bathroom",
    label: "Bathroom",
    icon: "mdi:shower",
    climate: "climate.bathroom",
    target: "sensor.heating_bathroom_automatic_target",
    timer: "timer.heating_bathroom_boost",
    fallback: "input_number.heating_bathroom_default",
    schedules: ["bathroom_boost"],
  },
  {
    id: "bedroom",
    label: "Bedroom",
    icon: "mdi:bed-king",
    climate: "climate.bedroom",
    target: "sensor.heating_bedroom_automatic_target",
    timer: "timer.heating_bedroom_boost",
    fallback: "input_number.heating_bedroom_default",
    schedules: ["bedroom_daytime"],
    gate: "binary_sensor.upstairs_windows",
    gateLabel: "Upstairs windows",
  },
  {
    id: "downstairs",
    label: "Downstairs",
    icon: "mdi:sofa",
    climate: "climate.downstairs",
    target: "sensor.heating_downstairs_automatic_target",
    timer: "timer.heating_downstairs_boost",
    fallback: "input_number.heating_downstairs_default",
    schedules: ["downstairs_daytime"],
    gate: "binary_sensor.living_room_window_opening",
    gateLabel: "Living Room window",
    devices: [
      "climate.downstairs",
      "climate.kitchen",
      "climate.living_room",
      "climate.tado_smart_radiator_thermostat_va3247716352",
    ],
  },
  {
    id: "nursery",
    label: "Nursery",
    icon: "mdi:cradle",
    climate: "climate.nursery",
    target: "sensor.heating_nursery_automatic_target",
    timer: "timer.heating_nursery_boost",
    fallback: "input_number.heating_nursery_default",
    schedules: ["nursery_daytime"],
    devices: ["climate.nursery", "climate.nursery2"],
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function minute(value) {
  const [h, m] = String(value || "00:00")
    .split(":")
    .map(Number);
  return h === 24 ? 1440 : h * 60 + m;
}
function time(value) {
  const n = Math.max(0, Math.min(1440, Number(value)));
  return n === 1440
    ? "24:00:00"
    : `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}:00`;
}
function inputTime(value) {
  const n = minute(value);
  return n === 1440
    ? "23:59"
    : `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
function labelTime(value) {
  const n = minute(value);
  return n === 1440
    ? "24:00"
    : `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}
function sortBlocks(blocks = []) {
  return [...blocks].sort((a, b) => minute(a.from) - minute(b.from));
}
function validBlocks(blocks) {
  let end = -1;
  for (const block of sortBlocks(blocks)) {
    const from = minute(block.from),
      to = minute(block.to);
    if (
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from < 0 ||
      to > 1440 ||
      from >= to
    )
      return "Each period needs an end later than its start.";
    if (from < end) return "Periods cannot overlap.";
    end = to;
  }
  return "";
}
function normaliseSchedule(schedule) {
  const result = {
    id: schedule.id,
    name: schedule.name,
    ...(schedule.icon ? { icon: schedule.icon } : {}),
  };
  for (const day of DAYS)
    result[day] = sortBlocks(schedule[day] || []).map((block) => ({
      ...block,
      ...(block.data ? { data: { ...block.data } } : {}),
    }));
  return result;
}
function payload(schedule) {
  const normalized = normaliseSchedule(schedule);
  const error = DAYS.map((day) => validBlocks(normalized[day])).find(Boolean);
  if (error) throw new Error(error);
  return Object.fromEntries(
    ["name", "icon", ...DAYS]
      .filter((key) => normalized[key] !== undefined && normalized[key] !== "")
      .map((key) => [key, normalized[key]]),
  );
}
function overlays(defaultTemp, blocks) {
  return [
    {
      from: "00:00:00",
      to: "24:00:00",
      temperature: defaultTemp,
      baseline: true,
    },
    ...sortBlocks(blocks).map((block) => ({
      ...block,
      temperature: block.data?.temperature,
      baseline: false,
    })),
  ];
}
function nextTransition(blocks, now = new Date()) {
  const today = (now.getDay() + 6) % 7;
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 7; offset += 1) {
    const day = DAYS[(today + offset) % 7];
    const points = sortBlocks(blocks?.[day] || []).flatMap((block) => [
      block.from,
      block.to,
    ]);
    const point = points.find((item) => offset > 0 || minute(item) > nowMinute);
    if (point)
      return {
        day: offset === 0 ? "today" : DAY_LABELS[(today + offset) % 7],
        at: labelTime(point),
      };
  }
  return null;
}
function copyDay(schedule, from, destinations) {
  const result = clone(schedule);
  for (const day of destinations)
    if (day !== from) result[day] = clone(result[from] || []);
  return result;
}
function esc(value) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
}
function stateText(state) {
  return !state || state.state === "unavailable" || state.state === "unknown"
    ? "Unavailable"
    : state.state;
}
function temp(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n % 1 ? n.toFixed(1) : n}°` : "—";
}
function countdown(value, now = Date.now()) {
  const seconds = Math.max(
    0,
    Math.ceil((Date.parse(value || "") - now) / 1000),
  );
  if (!Number.isFinite(seconds)) return "—";
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor((seconds % 3600) / 60),
    remainingSeconds = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`
    : `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
function isUnavailable(state) {
  return !state || ["unavailable", "unknown"].includes(state.state);
}
function bridgeMode(power, cooldown) {
  if (isUnavailable(power)) return "unavailable";
  if (power.state === "off") return "off";
  return cooldown?.state === "active" ? "cooldown" : "armed";
}

function selfTest() {
  console.assert(minute("24:00:00") === 1440 && time(1440) === "24:00:00");
  console.assert(
    validBlocks([
      { from: "08:00:00", to: "09:00:00" },
      { from: "08:30:00", to: "10:00:00" },
    ]) === "Periods cannot overlap.",
  );
  const source = {
    id: "x",
    name: "X",
    monday: [
      {
        from: "08:00:00",
        to: "09:00:00",
        data: { temperature: 19, keep: true },
      },
    ],
  };
  const copied = copyDay(source, "monday", ["tuesday"]);
  console.assert(copied.tuesday[0].data.keep && !source.tuesday);
  console.assert(payload(source).monday[0].data.temperature === 19);
  console.assert(
    overlays(18, source.monday).length === 2 &&
      nextTransition({ monday: source.monday }, new Date("2026-09-14T07:00:00"))
        .at === "08:00",
  );
  const now = Date.parse("2026-09-15T12:00:00Z");
  console.assert(
    countdown("2026-09-15T13:02:03Z", now) === "1:02:03" &&
      countdown("2026-09-15T12:00:01Z", now) === "0:01" &&
      countdown("2026-09-15T11:59:59Z", now) === "0:00",
  );
  console.assert(
    bridgeMode({ state: "on" }, { state: "active" }) === "cooldown" &&
      bridgeMode({ state: "off" }) === "off" &&
      bridgeMode({ state: "unavailable" }) === "unavailable" &&
      bridgeMode({ state: "on" }, { state: "idle" }) === "armed",
  );
  console.log("heating-control-card self-test passed");
}
if (typeof window === "undefined") {
  if (process.argv.includes("--self-test")) selfTest();
} else {
  class HeatingControlCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.schedules = new Map();
      this.loading = true;
      this.error = "";
      this.editor = null;
      this.unsubscribe = null;
      this.lastFocus = null;
      this._renderQueued = false;
      this.boostInterval = null;
    }
    setConfig(config) {
      this.config = config || {};
    }
    set hass(hass) {
      this._hass = hass;
      if (!this._loaded) this.loadSchedules();
      this.queueRender();
    }
    getCardSize() {
      return 12;
    }
    static getStubConfig() {
      return {};
    }
    async loadSchedules() {
      if (!this._hass || this._loading) return;
      this._loading = true;
      try {
        const items = await this._hass.callWS({ type: "schedule/list" });
        this.schedules = new Map(
          items.map((item) => [item.id, normaliseSchedule(item)]),
        );
        this._loaded = true;
        this.error = "";
        if (!this.unsubscribe) this.subscribeSchedules();
      } catch (error) {
        this.error = `Could not load programmes: ${error.message || error}`;
      } finally {
        this.loading = false;
        this._loading = false;
        this.queueRender();
      }
    }
    async subscribeSchedules() {
      try {
        this.unsubscribe = await this._hass.connection.subscribeMessage(
          (message) => {
            for (const change of message) {
              if (change.change_type === "removed")
                this.schedules.delete(change.schedule_id);
              else
                this.schedules.set(
                  change.schedule_id,
                  normaliseSchedule(change.item),
                );
            }
            if (!this.editor) this.queueRender();
          },
          { type: "schedule/subscribe" },
        );
      } catch (_) {
        /* List refresh remains valid. */
      }
    }
    disconnectedCallback() {
      this.unsubscribe?.();
      this.unsubscribe = null;
      if (this.boostInterval) clearInterval(this.boostInterval);
      this.boostInterval = null;
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
    schedule(id) {
      return this.schedules.get(id);
    }
    boostActive(room) {
      return this.state(room.timer)?.state === "active";
    }
    roomSource(room) {
      const s = this.state,
        home = s("input_boolean.home_state")?.state === "on";
      if (room.gate && s(room.gate)?.state === "on") return "Window paused";
      if (this.boostActive(room)) return "Boost";
      if (
        room.id === "basement" &&
        Number(s(room.humidity)?.state) > room.humidityThreshold &&
        s("switch.dehumidifier_basement_switch")?.state === "on"
      )
        return "High humidity";
      if (
        ["attic", "bathroom", "bedroom"].includes(room.id) &&
        room.schedules?.some((id) => s(`schedule.${id}`)?.state === "on") &&
        !home
      )
        return "Away";
      if (["downstairs", "nursery"].includes(room.id) && !home) return "Away";
      if (room.schedules?.some((id) => s(`schedule.${id}`)?.state === "on"))
        return "Programme";
      return "Default";
    }
    exceptions() {
      const result = [];
      for (const room of ROOM_MAP) {
        if (this.state(room.gate)?.state === "on")
          result.push(`${room.label}: ${room.gateLabel} open`);
        if (isUnavailable(this.state(room.climate)))
          result.push(`${room.label}: climate unavailable`);
        if (isUnavailable(this.state(room.target)))
          result.push(`${room.label}: automatic target unavailable`);
        if (isUnavailable(this.state(room.timer)))
          result.push(`${room.label}: boost timer unavailable`);
        if (room.accessory && isUnavailable(this.state(room.accessory.entity)))
          result.push(
            `${room.label}: ${room.accessory.label.toLowerCase()} unavailable`,
          );
      }
      return result;
    }
    render() {
      if (!this._hass) return;
      const rooms = ROOM_MAP.map((room) => this.roomHtml(room)).join("");
      const errors = this.error
        ? `<div class="notice error" role="alert">${esc(this.error)} <button data-action="reload">Retry</button></div>`
        : "";
      this.shadowRoot.innerHTML = `<style>${this.styles()}</style><ha-card><main><header class="general">${this.generalHtml()}</header>${errors}<section class="rooms" aria-label="Heating zones">${this.loading ? "<div class='notice'>Loading programmes…</div>" : rooms}</section></main><dialog id="editor"></dialog></ha-card>`;
      this.bind();
      this.syncBoostInterval();
      this.updateBoostCountdowns();
      if (this.editor) this.openEditorDialog();
    }
    generalHtml() {
      const home = this.state("input_boolean.home_state"),
        states = ROOM_MAP.map((room) => this.state(room.climate));
      const counts = { heating: 0, idle: 0, off: 0, unavailable: 0 };
      for (const item of states) {
        if (isUnavailable(item)) counts.unavailable++;
        else if (item.state === "off") counts.off++;
        else if (item.attributes?.hvac_action === "heating") counts.heating++;
        else counts.idle++;
      }
      const exceptions = this.exceptions();
      return `<div class="general-title"><div><button class="presence presence-link" data-action="more-info" data-entity="input_boolean.home_state" aria-label="Open Home/Away details"><ha-icon icon="${home?.state === "on" ? "mdi:home-account" : "mdi:home-export-outline"}"></ha-icon>${home?.state === "on" ? "Home" : "Away"}</button></div><div class="summary"><b>${counts.heating}</b> heating <b>${counts.idle}</b> idle${counts.off ? ` <b>${counts.off}</b> off` : ""}${counts.unavailable ? ` <b>${counts.unavailable}</b> unavailable` : ""}</div></div><div class="general-controls">${this.numberControl("input_number.heating_away", "Away target")}${this.numberControl("input_number.heating_boost_duration", "Boost duration", "", (value) => `${value} min`)}${this.bridgeHtml()}${exceptions.length ? `<aside class="exceptions"><b>Needs attention</b>${exceptions.map((item) => `<span>${esc(item)}</span>`).join("")}</aside>` : ""}</div>`;
    }
    bridgeHtml() {
      const power = this.state(TADO_BRIDGE.power),
        cooldown = this.state(TADO_BRIDGE.cooldown),
        unavailable = Number(this.state(TADO_BRIDGE.unavailable)?.state) || 0,
        mode = bridgeMode(power, cooldown),
        finishesAt = cooldown?.attributes?.finishes_at || "";
      const content = {
        armed: {
          icon: "mdi:lan-connect",
          title: "Bridge on",
          detail: unavailable
            ? `${unavailable} device${unavailable === 1 ? "" : "s"} unavailable`
            : "Recovery armed",
        },
        cooldown: {
          icon: "mdi:timer-sand",
          title: "Bridge on",
          detail: `Cooldown <strong data-bridge-cooldown="${esc(finishesAt)}">${countdown(finishesAt)}</strong>`,
        },
        off: {
          icon: "mdi:power-plug-off",
          title: "Bridge off",
          detail: "Reset in progress",
        },
        unavailable: {
          icon: "mdi:lan-disconnect",
          title: "Bridge unavailable",
          detail: "Zigbee switch offline",
        },
      }[mode];
      return `<button class="bridge-status ${mode}" data-action="more-info" data-entity="${TADO_BRIDGE.power}" aria-label="Open Tado bridge switch details"><ha-icon icon="${content.icon}"></ha-icon><span><b>${content.title}</b><small>${content.detail}</small></span><ha-icon class="bridge-chevron" icon="mdi:chevron-right"></ha-icon></button>`;
    }
    roomHtml(room) {
      const climate = this.state(room.climate),
        target = this.state(room.target),
        timer = this.state(room.timer),
        schedule = room.schedules?.map((id) => this.schedule(id)).find(Boolean),
        boosting = this.boostActive(room);
      const today = DAYS[(new Date().getDay() + 6) % 7],
        blocks = schedule?.[today] || [],
        transition = schedule && nextTransition(schedule),
        source = this.roomSource(room),
        windowOpen = room.gate && this.state(room.gate)?.state === "on",
        override = windowOpen ? "window" : boosting ? "boost" : "";
      return `<article class="room ${isUnavailable(climate) ? "unavailable" : ""}" data-room="${room.id}"><div class="room-head"><div class="room-name"><ha-icon icon="${room.icon}"></ha-icon><h2>${room.label}</h2>${override ? "" : `<span class="badge ${source.toLowerCase().replace(/ /g, "-")}">${source}</span>`}</div><div class="room-reading"><button class="temperature" data-action="more-info" data-entity="${room.climate}" aria-label="Open ${room.label} climate details"><strong>${temp(climate?.attributes?.current_temperature)}</strong><span>Current temperature</span></button></div></div>${override ? this.overrideHtml(room, override, climate, target, timer) : schedule ? this.timelineHtml(room, schedule, blocks, transition) : room.humidity ? this.humidityRuleHtml(room) : "<div class='no-programme'>Rule-driven target · no heating programme</div>"}<div class="room-settings">${this.numberControl(room.fallback, "Default target")}${room.humidityTarget ? this.numberControl(room.humidityTarget, "High humidity target") : ""}</div>${this.contextHtml(room)}</article>`;
    }
    overrideHtml(room, override, climate, target, timer) {
      if (override === "window")
        return `<section class="override window-override"><ha-icon icon="mdi:window-open-variant"></ha-icon><div><b>Heating paused</b><span>${esc(room.gateLabel)} open · automatic target ${temp(target?.state)} resumes when closed</span></div></section>`;
      return `<section class="override boost-override"><ha-icon icon="mdi:fire"></ha-icon><div><b>Boost running · ${temp(climate?.attributes?.temperature)}</b><span>Automatic target ${temp(target?.state)} returns in <strong data-boost-end="${esc(timer?.attributes?.finishes_at || "")}">${countdown(timer?.attributes?.finishes_at)}</strong></span></div><button data-action="cancel-boost" data-timer="${room.timer}" ${!this.admin ? "disabled" : ""}>Cancel boost</button></section>`;
    }
    humidityRuleHtml(room) {
      const humidity = this.state(room.humidity),
        dehumidifier = this.state(room.accessory?.entity),
        active =
          Number(humidity?.state) > room.humidityThreshold &&
          dehumidifier?.state === "on";
      return `<section class="programme humidity-rule"><div class="programme-label"><span>Humidity rule</span><span class="readonly">Live</span></div><div class="rule-rail" aria-label="Humidity rule"><span>Humidity<b>${esc(stateText(humidity))}%</b></span><span>Threshold<b>&gt; ${room.humidityThreshold}%</b></span><span>Dehumidifier<b>${esc(stateText(dehumidifier))}</b></span></div><div class="period-chips"><span>${active ? `High humidity target · ${temp(this.state(room.humidityTarget)?.state)}` : `Default target · ${temp(this.state(room.fallback)?.state)}`}</span></div><p class="next">High target applies above ${room.humidityThreshold}% while dehumidifier runs.</p></section>`;
    }
    timelineHtml(room, schedule, blocks, transition) {
      const fallback = this.state(room.fallback)?.state;
      const marker =
        ((new Date().getHours() * 60 + new Date().getMinutes()) / 1440) * 100;
      const paused = this.boostActive(room);
      return `<section class="programme ${paused ? "paused" : ""}"><div class="programme-label"><span>Today · ${esc(schedule.name)}</span>${this.admin ? `<button data-action="edit" data-room="${room.id}" data-schedule="${schedule.id}">Edit week</button>` : "<span class='readonly'>Read-only</span>"}</div><div class="rail" aria-label="Today's programme"><div class="baseline">${temp(fallback)}</div>${blocks
        .map((block) => {
          const left = minute(block.from) / 14.4,
            width = (minute(block.to) - minute(block.from)) / 14.4;
          return `<button class="period" style="left:${left}%;width:${width}%" data-action="edit-block" data-room="${room.id}" data-schedule="${schedule.id}" data-day="${DAYS[(new Date().getDay() + 6) % 7]}" data-index="${blocks.indexOf(block)}" aria-label="${labelTime(block.from)} to ${labelTime(block.to)}, ${temp(block.data?.temperature)}">${temp(block.data?.temperature)}</button>`;
        })
        .join(
          "",
        )}<i style="left:${marker}%" aria-label="Current time"></i></div><div class="period-chips">${blocks.length ? blocks.map((block) => `<button data-action="edit-block" data-room="${room.id}" data-schedule="${schedule.id}" data-day="${DAYS[(new Date().getDay() + 6) % 7]}" data-index="${blocks.indexOf(block)}">${labelTime(block.from)}–${labelTime(block.to)} · ${temp(block.data?.temperature)}</button>`).join("") : `<span>Default all day · ${temp(fallback)}</span>`}</div><p class="next">${paused ? "Programme paused by boost" : transition ? `Next programme transition ${esc(transition.day)} at ${transition.at}` : "No upcoming programme transition"}</p></section>`;
    }
    numberControl(entity, label, detail = "", format = temp) {
      const item = this.state(entity),
        unavailable = isUnavailable(item),
        attrs = item?.attributes || {},
        value = Number(item?.state),
        min = attrs.min ?? 5,
        max = attrs.max ?? 25,
        step = attrs.step ?? 0.5;
      return `<label class="number ${unavailable ? "disabled" : ""}"><span>${esc(label)}${detail ? `<small>${esc(detail)}</small>` : ""}</span><div><button data-action="number" data-entity="${entity}" data-delta="-${step}" ${!this.admin || unavailable ? "disabled" : ""} aria-label="Lower ${esc(label)}">−</button><output>${unavailable ? "—" : format(value)}</output><button data-action="number" data-entity="${entity}" data-delta="${step}" data-min="${min}" data-max="${max}" ${!this.admin || unavailable ? "disabled" : ""} aria-label="Raise ${esc(label)}">+</button></div></label>`;
    }
    contextHtml(room) {
      const s = this.state;
      const parts = [];
      if (room.humidity)
        parts.push(
          `<span><ha-icon icon="mdi:water-percent"></ha-icon> Humidity ${esc(stateText(s(room.humidity)))}%</span>`,
        );
      if (room.gate)
        parts.push(
          `<span class="${s(room.gate)?.state === "on" ? "warning" : ""}"><ha-icon icon="mdi:window-${s(room.gate)?.state === "on" ? "open" : "closed"}"></ha-icon> ${esc(room.gateLabel)} ${s(room.gate)?.state === "on" ? "open" : "closed"}</span>`,
        );
      if (room.accessory) {
        const item = s(room.accessory.entity),
          disabled = !this.admin || isUnavailable(item);
        parts.push(
          `<button class="accessory" data-action="toggle" data-entity="${room.accessory.entity}" ${disabled ? "disabled" : ""}><ha-icon icon="mdi:power"></ha-icon>${esc(room.accessory.label)} <b>${esc(stateText(item))}</b></button><small class="accessory-note">${esc(room.accessory.note)}</small>`,
        );
      }
      if (room.accessorySchedule) {
        const schedule = this.schedule(room.accessorySchedule);
        parts.push(
          `<button class="accessory programme-link" data-action="edit" data-room="${room.id}" data-schedule="${room.accessorySchedule}" ${!this.admin ? "disabled" : ""}>Dehumidifier programme · ${schedule ? esc(schedule.name) : "Unavailable"}</button>`,
        );
      }
      if (room.devices)
        parts.push(
          `<details class="devices"><summary>${room.devices.length}-device zone health</summary>${room.devices
            .map((entity) => {
              const item = s(entity);
              return `<span>${esc(item?.attributes?.friendly_name?.replace("Tado ", "") || entity)} <b>${isUnavailable(item) ? "Unavailable" : `${temp(item.attributes?.current_temperature)} · ${esc(item.attributes?.hvac_action || item.state)}`}</b></span>`;
            })
            .join("")}</details>`,
        );
      return parts.length
        ? `<footer class="context">${parts.join("")}</footer>`
        : "";
    }
    syncBoostInterval() {
      const active =
        ROOM_MAP.some((room) => this.boostActive(room)) ||
        this.state(TADO_BRIDGE.cooldown)?.state === "active";
      if (active && !this.boostInterval)
        this.boostInterval = setInterval(
          () => this.updateBoostCountdowns(),
          1000,
        );
      if (!active && this.boostInterval) {
        clearInterval(this.boostInterval);
        this.boostInterval = null;
      }
    }
    updateBoostCountdowns() {
      for (const item of this.shadowRoot.querySelectorAll("[data-boost-end]"))
        item.textContent = countdown(item.dataset.boostEnd);
      for (const item of this.shadowRoot.querySelectorAll(
        "[data-bridge-cooldown]",
      ))
        item.textContent = countdown(item.dataset.bridgeCooldown);
    }
    bind() {
      this.shadowRoot.addEventListener("click", (event) => this.click(event));
    }
    async click(event) {
      const control = event.target.closest("[data-action]");
      if (!control) return;
      const action = control.dataset.action;
      if (action === "reload") return this.loadSchedules();
      if (action === "more-info")
        return this.dispatchEvent(
          new CustomEvent("hass-more-info", {
            detail: { entityId: control.dataset.entity },
            bubbles: true,
            composed: true,
          }),
        );
      if (action === "number") return this.changeNumber(control);
      if (action === "toggle") return this.toggle(control);
      if (action === "cancel-boost") return this.cancelBoost(control);
      if (action === "edit" || action === "edit-block") {
        if (!this.admin) return;
        this.lastFocus = control;
        this.editor = {
          scheduleId: control.dataset.schedule,
          roomId: control.dataset.room,
          draft: clone(this.schedule(control.dataset.schedule)),
          selectedDay:
            control.dataset.day || DAYS[(new Date().getDay() + 6) % 7],
          selectedBlock:
            action === "edit-block" ? Number(control.dataset.index) : null,
          dirty: false,
          error: "",
        };
        this.openEditorDialog();
      }
    }
    async changeNumber(control) {
      const entity = control.dataset.entity,
        item = this.state(entity),
        attrs = item.attributes || {},
        next = Math.max(
          Number(attrs.min ?? 5),
          Math.min(
            Number(attrs.max ?? 25),
            Number(item.state) + Number(control.dataset.delta),
          ),
        );
      try {
        control.parentElement.classList.add("pending");
        await this._hass.callService("input_number", "set_value", {
          entity_id: entity,
          value: next,
        });
      } catch (error) {
        this.error = `Could not update ${entity}: ${error.message || error}`;
        this.queueRender();
      }
    }
    async cancelBoost(control) {
      try {
        control.disabled = true;
        await this._hass.callService("timer", "cancel", {
          entity_id: control.dataset.timer,
        });
      } catch (error) {
        this.error = `Could not cancel boost: ${error.message || error}`;
        this.queueRender();
      }
    }
    async toggle(control) {
      try {
        control.disabled = true;
        await this._hass.callService(
          "switch",
          this.state(control.dataset.entity)?.state === "on"
            ? "turn_off"
            : "turn_on",
          { entity_id: control.dataset.entity },
        );
      } catch (error) {
        this.error = `Could not change ${control.dataset.entity}: ${error.message || error}`;
        this.queueRender();
      }
    }
    openEditorDialog() {
      const dialog = this.shadowRoot.querySelector("#editor"),
        editor = this.editor;
      if (!editor || !dialog) return;
      const schedule = editor.draft,
        day = editor.selectedDay,
        blocks = schedule[day] || [],
        room = ROOM_MAP.find((item) => item.id === editor.roomId);
      dialog.innerHTML = `<form method="dialog" class="editor"><header><div><p class="eyebrow">${esc(room?.label || "Room")} PROGRAMME</p><h2>${esc(schedule.name)}</h2></div><button value="cancel" aria-label="Close editor">×</button></header><div class="editor-body"><nav class="week" aria-label="Days of week">${DAYS.map((item, index) => `<button type="button" data-editor="day" data-day="${item}" class="${day === item ? "selected" : ""}"><b>${DAY_LABELS[index]}</b>${this.miniRail(schedule[item] || [])}</button>`).join("")}</nav><section class="day-editor"><div class="day-title"><h3>${DAY_LABELS[DAYS.indexOf(day)]}</h3><button type="button" data-editor="copy">Copy day</button></div><div class="rows">${blocks.map((block, index) => this.blockRow(block, index)).join("") || "<p class='empty'>Default all day. Add a period to schedule a change.</p>"}</div><button type="button" class="add" data-editor="add">+ Add period</button>${editor.error ? `<p class="form-error" role="alert">${esc(editor.error)}</p>` : ""}</section></div><footer><span aria-live="polite">${editor.dirty ? "Unsaved changes" : ""}</span><button value="cancel">Cancel</button><button type="button" data-editor="save" class="save" ${editor.dirty ? "" : "disabled"}>Save</button></footer></form>`;
      dialog.oncancel = (event) => {
        if (editor.dirty && !confirm("Discard unsaved programme changes?"))
          event.preventDefault();
        else this.editor = null;
      };
      dialog.addEventListener(
        "close",
        () => {
          if (!dialog.open) {
            this.editor = null;
            this.lastFocus?.focus();
          }
        },
        { once: true },
      );
      dialog.addEventListener("click", (event) => this.editorClick(event));
      dialog.addEventListener("change", (event) => this.editorInput(event));
      if (!dialog.open) dialog.showModal();
    }
    miniRail(blocks) {
      return `<i>${sortBlocks(blocks)
        .map(
          (block) =>
            `<b style="left:${minute(block.from) / 14.4}%;width:${(minute(block.to) - minute(block.from)) / 14.4}%"></b>`,
        )
        .join("")}</i>`;
    }
    blockRow(block, index) {
      return `<div class="block-row" data-index="${index}"><label>Start<input type="time" data-field="from" value="${inputTime(block.from)}"></label><label>End<input type="time" data-field="to" value="${inputTime(block.to)}"></label><label>Target<input type="number" data-field="temperature" min="5" max="25" step="0.5" value="${esc(block.data?.temperature ?? "")}"><span>°C</span></label><button type="button" data-editor="delete" data-index="${index}" aria-label="Delete period">Delete</button></div>`;
    }
    editorClick(event) {
      const control = event.target.closest("[data-editor]");
      if (!control || !this.editor) return;
      const action = control.dataset.editor,
        draft = this.editor.draft;
      if (action === "day") {
        this.editor.selectedDay = control.dataset.day;
        this.editor.selectedBlock = null;
        return this.openEditorDialog();
      }
      if (action === "add") {
        const blocks = (draft[this.editor.selectedDay] ||= []);
        const last = sortBlocks(blocks).at(-1);
        blocks.push({
          from: last ? last.to : "08:00:00",
          to:
            last && minute(last.to) < 1380
              ? time(minute(last.to) + 60)
              : "09:00:00",
          data: {
            temperature:
              Number(
                this.state(
                  ROOM_MAP.find((r) => r.id === this.editor.roomId)?.fallback,
                )?.state,
              ) || 18,
          },
        });
        this.editor.dirty = true;
        return this.openEditorDialog();
      }
      if (action === "delete") {
        draft[this.editor.selectedDay].splice(Number(control.dataset.index), 1);
        this.editor.dirty = true;
        return this.openEditorDialog();
      }
      if (action === "copy") {
        const targets = DAYS.filter((day) => day !== this.editor.selectedDay);
        const pick = prompt(
          `Copy ${DAY_LABELS[DAYS.indexOf(this.editor.selectedDay)]} to days (Mon,Tue,Wed,Thu,Fri,Sat,Sun):`,
          targets.map((day) => DAY_LABELS[DAYS.indexOf(day)]).join(","),
        );
        if (pick === null) return;
        const chosen = pick
          .split(",")
          .map(
            (x) =>
              DAYS[
                DAY_LABELS.map((d) => d.toLowerCase()).indexOf(
                  x.trim().slice(0, 3).toLowerCase(),
                )
              ],
          )
          .filter(Boolean);
        this.editor.draft = copyDay(draft, this.editor.selectedDay, chosen);
        this.editor.dirty = true;
        return this.openEditorDialog();
      }
      if (action === "save") return this.saveEditor();
    }
    editorInput(event) {
      const input = event.target;
      if (!input.matches("[data-field]") || !this.editor) return;
      const index = Number(input.closest(".block-row").dataset.index),
        block = this.editor.draft[this.editor.selectedDay][index];
      if (input.dataset.field === "temperature") {
        block.data ||= {};
        block.data.temperature = Number(input.value);
      } else
        block[input.dataset.field] =
          input.dataset.field === "to" && input.value === "00:00"
            ? "24:00:00"
            : time(minute(input.value));
      this.editor.dirty = true;
      this.editor.error = validBlocks(
        this.editor.draft[this.editor.selectedDay],
      );
      this.openEditorDialog();
    }
    async saveEditor() {
      const editor = this.editor;
      if (!editor) return;
      const schedule = normaliseSchedule(editor.draft);
      for (const day of DAYS) {
        const error = validBlocks(schedule[day]);
        if (error) {
          editor.error = `${DAY_LABELS[DAYS.indexOf(day)]}: ${error}`;
          return this.openEditorDialog();
        }
      }
      for (const day of DAYS)
        for (const block of schedule[day])
          if (!Number.isFinite(Number(block.data?.temperature))) {
            editor.error = "Each heating period needs a target temperature.";
            return this.openEditorDialog();
          }
      try {
        editor.error = "Saving…";
        this.openEditorDialog();
        await this._hass.callWS({
          type: "schedule/update",
          schedule_id: editor.scheduleId,
          ...payload(schedule),
        });
        const items = await this._hass.callWS({ type: "schedule/list" });
        this.schedules = new Map(
          items.map((item) => [item.id, normaliseSchedule(item)]),
        );
        this.editor = null;
        this.shadowRoot.querySelector("#editor")?.close();
        this.queueRender();
      } catch (error) {
        editor.error = `Could not save: ${error.message || error}`;
        this.openEditorDialog();
      }
    }
    styles() {
      return `:host{display:block;color:var(--primary-text-color)}ha-card{background:var(--card-background-color);box-shadow:none}main{padding:clamp(12px,2vw,28px);max-width:1600px;margin:auto}.general{border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,16px);padding:clamp(18px,3vw,30px);background:linear-gradient(135deg,var(--primary-background-color),var(--card-background-color));margin-bottom:20px}.general-title,.general-controls,.room-head,.programme-label,.day-title,.editor header,.editor footer{display:flex;justify-content:space-between;gap:16px;align-items:center}.eyebrow{margin:0;color:var(--secondary-text-color);font-size:.72rem;font-weight:700;letter-spacing:.08em}.general h1,.room h2,.editor h2,.day-title h3{margin:4px 0}.presence{display:flex;align-items:center;gap:6px;margin:8px 0 0}.presence-link{border:0;background:none;color:var(--primary-text-color);font:inherit;padding:0;cursor:pointer}.presence-link:hover{color:var(--primary-color)}.presence-link:focus-visible{outline:2px solid var(--primary-color);outline-offset:4px;border-radius:3px}.readonly{color:var(--secondary-text-color);font-size:.8rem}.summary{color:var(--secondary-text-color)}.summary b{color:var(--primary-text-color);font-size:1.2rem;margin-left:8px}.general-controls{align-items:stretch;justify-content:flex-start;margin-top:22px}.general-controls>.number{min-width:150px}.general-controls .number output{min-width:52px}.bridge-status{flex:0 0 auto;display:inline-grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;border:1px solid var(--divider-color);border-radius:9px;background:var(--secondary-background-color);color:var(--primary-text-color);padding:8px 10px;text-align:left;cursor:pointer;white-space:nowrap}.bridge-status:hover{border-color:var(--primary-color)}.bridge-status:focus-visible{outline:2px solid var(--primary-color);outline-offset:3px}.bridge-status>ha-icon:first-child{color:var(--primary-color)}.bridge-status span{display:grid;gap:2px}.bridge-status small{color:var(--secondary-text-color);font-size:.72rem}.bridge-status small strong{color:var(--primary-text-color)}.bridge-status.off{border-color:var(--warning-color,#f5a623)}.bridge-status.off>ha-icon:first-child{color:var(--warning-color,#f5a623)}.bridge-status.unavailable{border-color:var(--error-color)}.bridge-status.unavailable>ha-icon:first-child{color:var(--error-color)}.bridge-chevron{color:var(--secondary-text-color);font-size:1rem}.exceptions{flex:1;display:flex;gap:8px;flex-wrap:wrap;align-content:center;color:var(--secondary-text-color)}.exceptions b{width:100%;color:var(--primary-text-color)}.exceptions span{border-left:3px solid var(--error-color);padding-left:8px}.exceptions.ok{color:var(--success-color)}.rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:16px}.room{border:1px solid var(--divider-color);border-radius:var(--ha-card-border-radius,16px);padding:18px;background:var(--card-background-color);min-width:0}.room.unavailable{opacity:.75}.room-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.room-name ha-icon{color:var(--primary-color)}.badge{font-size:.72rem;padding:3px 7px;border-radius:100px;background:var(--secondary-background-color);color:var(--secondary-text-color)}.badge.programme{background:color-mix(in srgb,var(--primary-color) 15%,transparent);color:var(--primary-color)}.badge.boost{background:color-mix(in srgb,var(--warning-color,#f5a623) 20%,transparent);color:var(--warning-color,#f5a623)}.badge.away{background:color-mix(in srgb,var(--info-color) 18%,transparent);color:var(--info-color)}.badge.window-paused{background:color-mix(in srgb,var(--error-color) 15%,transparent);color:var(--error-color)}.room-reading{display:grid;justify-items:end;gap:7px}.temperature{background:none;border:0;color:inherit;text-align:right;padding:0;cursor:pointer}.temperature strong{display:block;font-size:2rem;line-height:1}.temperature span,.temperature small{display:block;color:var(--secondary-text-color);font-size:.75rem;margin-top:4px}.override{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;margin:18px 0;padding:14px;border:1px solid currentColor;border-radius:10px}.override ha-icon{font-size:1.5rem}.override div{display:grid;gap:3px}.override span,.override small{font-size:.78rem}.window-override,.boost-override{color:var(--warning-color,#f5a623)}.override button{border:1px solid var(--warning-color,#f5a623);border-radius:6px;background:var(--warning-color,#f5a623);color:#1c1b18;padding:6px 8px;font-weight:700;cursor:pointer}.override button:disabled{opacity:.55;cursor:not-allowed}.programme{margin:18px 0}.programme.paused{opacity:.7}.programme-label{font-size:.86rem;margin-bottom:8px}.programme-label button,.period-chips button,.programme-link{border:0;background:none;color:var(--primary-color);font:inherit;cursor:pointer;padding:4px}.rail{height:40px;background:var(--secondary-background-color);border-radius:8px;position:relative;overflow:hidden}.baseline{position:absolute;left:8px;top:11px;color:var(--secondary-text-color);font-size:.75rem}.period{position:absolute;top:4px;bottom:4px;min-width:4px;border:0;border-radius:5px;background:var(--primary-color);color:var(--text-primary-color,#fff);font-weight:700;font-size:.72rem;overflow:hidden;padding:0 4px;cursor:pointer}.rail i{position:absolute;top:0;bottom:0;border-left:2px solid var(--error-color);pointer-events:none}.period-chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.period-chips button,.period-chips span{background:var(--secondary-background-color);border-radius:5px;color:var(--primary-text-color);font-size:.75rem}.rule-rail{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--divider-color);border-radius:8px;overflow:hidden}.rule-rail span{display:grid;gap:3px;padding:8px;background:var(--secondary-background-color);color:var(--secondary-text-color);font-size:.7rem}.rule-rail b{color:var(--primary-text-color);font-size:.8rem}.next,.no-programme{color:var(--secondary-text-color);font-size:.8rem;margin:8px 0}.room-settings{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:8px;border-top:1px solid var(--divider-color);padding-top:14px}.number{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:.8rem}.number span small{display:block;color:var(--secondary-text-color);font-size:.68rem}.number div{display:flex;align-items:center;border:1px solid var(--divider-color);border-radius:7px;overflow:hidden}.number button{border:0;background:var(--secondary-background-color);color:var(--primary-text-color);font-size:1.1rem;width:28px;height:30px;cursor:pointer}.number output{min-width:38px;text-align:center;font-weight:700}.number.disabled{opacity:.55}.context{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-top:1px solid var(--divider-color);margin-top:14px;padding-top:12px;font-size:.78rem;color:var(--secondary-text-color)}.context>span,.accessory,.devices{display:flex;align-items:center;gap:4px}.warning{color:var(--warning-color,#f5a623)}.accessory{border:1px solid var(--divider-color);border-radius:7px;background:var(--secondary-background-color);color:var(--primary-text-color);padding:6px 8px;cursor:pointer}.accessory:disabled{opacity:.55;cursor:not-allowed}.accessory-note{width:100%}.devices{width:100%;display:block}.devices summary{cursor:pointer;color:var(--primary-color)}.devices span{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--divider-color)}.notice{grid-column:1/-1;padding:12px;border-radius:8px;background:var(--secondary-background-color)}.notice.error,.form-error{color:var(--error-color)}dialog{border:0;padding:0;max-width:min(900px,calc(100vw - 24px));width:900px;border-radius:16px;background:var(--card-background-color);color:var(--primary-text-color);box-shadow:0 16px 50px #0008}.editor header,.editor footer{padding:18px 22px;border-bottom:1px solid var(--divider-color)}.editor footer{border-top:1px solid var(--divider-color);border-bottom:0}.editor header button,.editor footer button,.day-title button,.add{border:1px solid var(--divider-color);border-radius:7px;background:var(--secondary-background-color);color:var(--primary-text-color);padding:8px 12px;cursor:pointer}.editor .save{background:var(--primary-color);color:var(--text-primary-color,#fff);border-color:var(--primary-color)}.editor .save:disabled{opacity:.5}.editor-body{padding:18px 22px}.week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.week button{background:var(--secondary-background-color);color:var(--primary-text-color);border:1px solid transparent;border-radius:7px;padding:7px 4px;cursor:pointer}.week button.selected{border-color:var(--primary-color)}.week i{display:block;height:5px;background:var(--divider-color);position:relative;margin-top:5px;border-radius:4px;overflow:hidden}.week i b{position:absolute;top:0;bottom:0;background:var(--primary-color)}.day-editor{margin-top:20px}.block-row{display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end;margin:10px 0}.block-row label{display:grid;gap:4px;font-size:.78rem;color:var(--secondary-text-color);position:relative}.block-row input{height:36px;box-sizing:border-box;border:1px solid var(--divider-color);border-radius:6px;background:var(--card-background-color);color:var(--primary-text-color);padding:0 8px}.block-row label span{position:absolute;right:8px;bottom:10px}.block-row button{height:36px;border:0;background:none;color:var(--error-color);cursor:pointer}.empty{color:var(--secondary-text-color)}@media(max-width:640px){main{padding:10px}.general-title,.general-controls,.room-head{align-items:flex-start;flex-direction:column}.room-reading{justify-items:start}.temperature{text-align:left}.week{grid-template-columns:repeat(4,1fr)}.block-row{grid-template-columns:1fr 1fr}.block-row button{grid-column:span 2;text-align:left;padding:0}.editor-body,.editor header,.editor footer{padding:14px}.editor{min-height:100dvh}.editor footer{position:sticky;bottom:0;background:var(--card-background-color)}dialog{max-width:100vw;width:100vw;min-height:100dvh;border-radius:0}.general-controls{align-items:stretch}}`;
    }
  }
  customElements.define("heating-control-card", HeatingControlCard);
}
