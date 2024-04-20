import { CE } from "../utils/html";
import type { PreferenceSetting } from "./preferences";

type MultipleOptionsParams = {
    size?: number;
}

type NumberStepperParams = {
    suffix?: string;
    disabled?: boolean;
    hideSlider?: boolean;

    ticks?: number;
    exactTicks?: number;
}

export enum SettingElementType {
    OPTIONS = 'options',
    MULTIPLE_OPTIONS = 'multiple-options',
    NUMBER = 'number',
    NUMBER_STEPPER = 'number-stepper',
    CHECKBOX = 'checkbox',
}

export class SettingElement {
    static #renderOptions(key: string, setting: PreferenceSetting, currentValue: any, onChange: any) {
        const $control = CE<HTMLSelectElement>('select') as HTMLSelectElement;
        for (let value in setting.options) {
            const label = setting.options[value];

            const $option = CE<HTMLOptionElement>('option', {value: value}, label);
            $control.appendChild($option);
        }

        $control.value = currentValue;
        onChange && $control.addEventListener('change', e => {
            const target = e.target as HTMLSelectElement;
            const value = (setting.type && setting.type === 'number') ? parseInt(target.value) : target.value;
            onChange(e, value);
        });

        // Custom method
        ($control as any).setValue = (value: any) => {
            $control.value = value;
        };

        return $control;
    }

    static #renderMultipleOptions(key: string, setting: PreferenceSetting, currentValue: any, onChange: any, params: MultipleOptionsParams={}) {
        const $control = CE<HTMLSelectElement>('select', {'multiple': true});
        if (params && params.size) {
            $control.setAttribute('size', params.size.toString());
        }

        for (let value in setting.multiple_options) {
            const label = setting.multiple_options[value];

            const $option = CE<HTMLOptionElement>('option', {value: value}, label) as HTMLOptionElement;
            $option.selected = currentValue.indexOf(value) > -1;

            $option.addEventListener('mousedown', function(e) {
                e.preventDefault();

                const target = e.target as HTMLOptionElement;
                target.selected = !target.selected;

                const $parent = target.parentElement!;
                $parent.focus();
                $parent.dispatchEvent(new Event('change'));
            });

            $control.appendChild($option);
        }

        $control.addEventListener('mousedown', function(e) {
            const self = this;
            const orgScrollTop = self.scrollTop;
            setTimeout(() => (self.scrollTop = orgScrollTop), 0);
        });

        $control.addEventListener('mousemove', e => e.preventDefault());

        onChange && $control.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLSelectElement
            const values = Array.from(target.selectedOptions).map(i => i.value);
            onChange(e, values);
        });

        return $control;
    }

    static #renderNumber(key: string, setting: PreferenceSetting, currentValue: any, onChange: any) {
        const $control = CE('input', {'type': 'number', 'min': setting.min, 'max': setting.max}) as HTMLInputElement;
        $control.value = currentValue;
        onChange && $control.addEventListener('change', (e: Event) => {
            const target = e.target as HTMLInputElement;

            const value = Math.max(setting.min!, Math.min(setting.max!, parseInt(target.value)));
            target.value = value.toString();

            onChange(e, value);
        });

        return $control;
    }

    static #renderCheckbox(key: string, setting: PreferenceSetting, currentValue: any, onChange: any) {
        const $control = CE('input', {'type': 'checkbox'}) as HTMLInputElement;
        $control.checked = currentValue;

        onChange && $control.addEventListener('change', e => {
            onChange(e, (e.target as HTMLInputElement).checked);
        });

        return $control;
    }

    static #renderNumberStepper(key: string, setting: PreferenceSetting, value: any, onChange: any, options: NumberStepperParams={}) {
        options = options || {};
        options.suffix = options.suffix || '';
        options.disabled = !!options.disabled;
        options.hideSlider = !!options.hideSlider;

        let $text: HTMLSpanElement;
        let $decBtn: HTMLButtonElement;
        let $incBtn: HTMLButtonElement;
        let $range: HTMLInputElement;

        const MIN = setting.min!;
        const MAX = setting.max!;
        const STEPS = Math.max(setting.steps || 1, 1);

        const $wrapper = CE('div', {'class': 'bx-number-stepper'},
                            $decBtn = CE('button', {'data-type': 'dec'}, '-') as HTMLButtonElement,
                            $text = CE('span', {}, value + options.suffix) as HTMLSpanElement,
                            $incBtn = CE('button', {'data-type': 'inc'}, '+') as HTMLButtonElement,
                           );

        if (!options.disabled && !options.hideSlider) {
            $range = CE('input', {'type': 'range', 'min': MIN, 'max': MAX, 'value': value, 'step': STEPS}) as HTMLInputElement;
            $range.addEventListener('input', e => {
                value = parseInt((e.target as HTMLInputElement).value);

                $text.textContent = value + options.suffix;
                onChange && onChange(e, value);
            });
            $wrapper.appendChild($range);

            if (options.ticks || options.exactTicks) {
                const markersId = `markers-${key}`;
                const $markers = CE('datalist', {'id': markersId});
                $range.setAttribute('list', markersId);

                if (options.exactTicks) {
                    let start = Math.max(Math.floor(MIN / options.exactTicks), 1) * options.exactTicks;

                    if (start === MIN) {
                        start += options.exactTicks;
                    }

                    for (let i = start; i < MAX; i += options.exactTicks) {
                        $markers.appendChild(CE<HTMLOptionElement>('option', {'value': i}));
                    }
                } else {
                    for (let i = MIN + options.ticks!; i < MAX; i += options.ticks!) {
                        $markers.appendChild(CE<HTMLOptionElement>('option', {'value': i}));
                    }
                }
                $wrapper.appendChild($markers);
            }
        }

        if (options.disabled) {
            $incBtn.disabled = true;
            $incBtn.classList.add('bx-hidden');

            $decBtn.disabled = true;
            $decBtn.classList.add('bx-hidden');
            return $wrapper;
        }

        let interval: number;
        let isHolding = false;

        const onClick = (e: Event) => {
            if (isHolding) {
                e.preventDefault();
                isHolding = false;

                return;
            }

            const btnType = (e.target as HTMLElement).getAttribute('data-type');
            if (btnType === 'dec') {
                value = Math.max(MIN, value - STEPS);
            } else {
                value = Math.min(MAX, value + STEPS);
            }

            $text.textContent = value + options.suffix;
            $range && ($range.value = value);

            isHolding = false;
            onChange && onChange(e, value);
        }

        const onMouseDown = (e: MouseEvent | TouchEvent) => {
            isHolding = true;

            const args = arguments;
            interval = setInterval(() => {
                const event = new Event('click');
                (event as any).arguments = args;

                e.target?.dispatchEvent(event);
            }, 200);
        };

        const onMouseUp = (e: MouseEvent | TouchEvent) => {
            clearInterval(interval);
            isHolding = false;
        };

        // Custom method
        ($wrapper as any).setValue = (value: any) => {
            $text.textContent = value + options.suffix;
            $range && ($range.value = value);
        };

        $decBtn.addEventListener('click', onClick);
        $decBtn.addEventListener('mousedown', onMouseDown);
        $decBtn.addEventListener('mouseup', onMouseUp);
        $decBtn.addEventListener('touchstart', onMouseDown);
        $decBtn.addEventListener('touchend', onMouseUp);

        $incBtn.addEventListener('click', onClick);
        $incBtn.addEventListener('mousedown', onMouseDown);
        $incBtn.addEventListener('mouseup', onMouseUp);
        $incBtn.addEventListener('touchstart', onMouseDown);
        $incBtn.addEventListener('touchend', onMouseUp);

        return $wrapper;
    }

    static #METHOD_MAP = {
        [SettingElementType.OPTIONS]: SettingElement.#renderOptions,
        [SettingElementType.MULTIPLE_OPTIONS]: SettingElement.#renderMultipleOptions,
        [SettingElementType.NUMBER]: SettingElement.#renderNumber,
        [SettingElementType.NUMBER_STEPPER]: SettingElement.#renderNumberStepper,
        [SettingElementType.CHECKBOX]: SettingElement.#renderCheckbox,
    };

    static render(type: SettingElementType, key: string, setting: PreferenceSetting, currentValue: any, onChange: any, options: any) {
        const method = SettingElement.#METHOD_MAP[type];
        // @ts-ignore
        const $control = method(...Array.from(arguments).slice(1)) as HTMLElement;
        $control.id = `bx_setting_${key}`;

        // Add "name" property to "select" elements
        if (type === SettingElementType.OPTIONS || type === SettingElementType.MULTIPLE_OPTIONS) {
            ($control as HTMLSelectElement).name = $control.id;
        }

        return $control;
    }
}
