import { STATES, AppInterface, SCRIPT_VERSION } from "@utils/global";
import { CE, createButton, ButtonStyle } from "@utils/html";
import { BxIcon } from "@utils/bx-icon";
import { getPreferredServerRegion } from "@utils/region";
import { UserAgent, UserAgentProfile } from "@utils/user-agent";
import { getPref, Preferences, PrefKey, setPref, toPrefElement } from "@utils/preferences";
import { t, Translations } from "@utils/translation";
import { PatcherCache } from "../patcher";

const SETTINGS_UI = {
    'Better xCloud': {
        items: [
            PrefKey.BETTER_XCLOUD_LOCALE,
            PrefKey.REMOTE_PLAY_ENABLED,
        ],
    },

    [t('server')]: {
        items: [
            PrefKey.SERVER_REGION,
            PrefKey.STREAM_PREFERRED_LOCALE,
            PrefKey.PREFER_IPV6_SERVER,
        ],
    },

    [t('stream')]: {
        items: [
            PrefKey.STREAM_TARGET_RESOLUTION,
            PrefKey.STREAM_CODEC_PROFILE,

            PrefKey.BITRATE_VIDEO_MAX,

            PrefKey.AUDIO_ENABLE_VOLUME_CONTROL,
            PrefKey.STREAM_DISABLE_FEEDBACK_DIALOG,

            PrefKey.SCREENSHOT_APPLY_FILTERS,

            PrefKey.AUDIO_MIC_ON_PLAYING,
            PrefKey.GAME_FORTNITE_FORCE_CONSOLE,
            PrefKey.STREAM_COMBINE_SOURCES,
        ],
    },

    [t('game-bar')]: {
        items: [
            PrefKey.GAME_BAR_POSITION,
        ],
    },

    [t('local-co-op')]: {
        items: [
            PrefKey.LOCAL_CO_OP_ENABLED,
        ],
    },

    [t('mouse-and-keyboard')]: {
        items: [
            PrefKey.NATIVE_MKB_ENABLED,
            PrefKey.MKB_ENABLED,
            PrefKey.MKB_HIDE_IDLE_CURSOR,
        ],
    },

    [t('touch-controller')]: {
        note: !STATES.userAgentHasTouchSupport ? '⚠️ ' + t('device-unsupported-touch') : null,
        unsupported: !STATES.userAgentHasTouchSupport,
        items: [
            PrefKey.STREAM_TOUCH_CONTROLLER,
            PrefKey.STREAM_TOUCH_CONTROLLER_AUTO_OFF,
            PrefKey.STREAM_TOUCH_CONTROLLER_DEFAULT_OPACITY,
            PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_STANDARD,
            PrefKey.STREAM_TOUCH_CONTROLLER_STYLE_CUSTOM,
        ],
    },

    [t('loading-screen')]: {
        items: [
            PrefKey.UI_LOADING_SCREEN_GAME_ART,
            PrefKey.UI_LOADING_SCREEN_WAIT_TIME,
            PrefKey.UI_LOADING_SCREEN_ROCKET,
        ],
    },

    [t('ui')]: {
        items: [
            PrefKey.UI_LAYOUT,
            PrefKey.UI_HOME_CONTEXT_MENU_DISABLED,
            PrefKey.STREAM_SIMPLIFY_MENU,
            PrefKey.SKIP_SPLASH_VIDEO,
            !AppInterface && PrefKey.UI_SCROLLBAR_HIDE,
            PrefKey.HIDE_DOTS_ICON,
            PrefKey.REDUCE_ANIMATIONS,
        ],
    },

    [t('other')]: {
        items: [
            PrefKey.BLOCK_SOCIAL_FEATURES,
            PrefKey.BLOCK_TRACKING,
        ],
    },

    [t('advanced')]: {
        items: [
            PrefKey.USER_AGENT_PROFILE,
        ],
    },
};


export function setupSettingsUi() {
    // Avoid rendering the Settings multiple times
    if (document.querySelector('.bx-settings-container')) {
        return;
    }

    const PREF_PREFERRED_REGION = getPreferredServerRegion();
    const PREF_LATEST_VERSION = getPref(PrefKey.LATEST_VERSION);

    let $btnReload: HTMLButtonElement;

    // Setup Settings UI
    const $container = CE<HTMLElement>('div', {
        'class': 'bx-settings-container bx-gone',
    });

    let $updateAvailable;

    const $wrapper = CE<HTMLElement>('div', {'class': 'bx-settings-wrapper'},
            CE<HTMLElement>('div', {'class': 'bx-settings-title-wrapper'},
                CE('a', {
                    'class': 'bx-settings-title',
                    'href': 'https://github.com/redphx/better-xcloud/releases',
                    'target': '_blank',
                }, 'Better xCloud ' + SCRIPT_VERSION),
                createButton({
                    icon: BxIcon.QUESTION,
                    style: ButtonStyle.FOCUSABLE,
                    label: t('help'),
                    url: 'https://better-xcloud.github.io/features/',
                }),
            )
        );
    $updateAvailable = CE('a', {
        'class': 'bx-settings-update bx-gone',
        'href': 'https://github.com/redphx/better-xcloud/releases/latest',
        'target': '_blank',
    });

    $wrapper.appendChild($updateAvailable);

    // Show new version indicator
    if (!SCRIPT_VERSION.includes('beta') && PREF_LATEST_VERSION && PREF_LATEST_VERSION != SCRIPT_VERSION) {
        $updateAvailable.textContent = `🌟 Version ${PREF_LATEST_VERSION} available`;
        $updateAvailable.classList.remove('bx-gone');
    }

    if (AppInterface) {
        // Show Android app settings button
        const $btn = createButton({
            label: t('android-app-settings'),
            icon: BxIcon.STREAM_SETTINGS,
            style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
            onClick: e => {
                AppInterface.openAppSettings && AppInterface.openAppSettings();
            },
        });

        $wrapper.appendChild($btn);
    } else {
        // Show link to Android app
        const userAgent = UserAgent.getDefault().toLowerCase();
        if (userAgent.includes('android')) {
            const $btn = createButton({
                label: '🔥 ' + t('install-android'),
                style: ButtonStyle.FULL_WIDTH | ButtonStyle.FOCUSABLE,
                url: 'https://better-xcloud.github.io/android',
            });

            $wrapper.appendChild($btn);
        }
    }

    const onChange = async (e: Event) => {
        // Clear PatcherCache;
        PatcherCache.clear();

        $btnReload.classList.add('bx-danger');

        // Highlight the Settings button in the Header to remind user to reload the page
        const $btnHeaderSettings = document.querySelector('.bx-header-settings-button');
        $btnHeaderSettings && $btnHeaderSettings.classList.add('bx-danger');

        if ((e.target as HTMLElement).id === 'bx_setting_' + PrefKey.BETTER_XCLOUD_LOCALE) {
            // Update locale
            Translations.refreshCurrentLocale();
            await Translations.updateTranslations();

            $btnReload.textContent = t('settings-reloading');
            $btnReload.click();
        }
    };

    // Render settings
    for (let groupLabel in SETTINGS_UI) {
        const $group = CE('span', {'class': 'bx-settings-group-label'}, groupLabel);

        // Render note
        if (SETTINGS_UI[groupLabel].note) {
            const $note = CE('b', {}, SETTINGS_UI[groupLabel].note);
            $group.appendChild($note);
        }

        $wrapper.appendChild($group);

        // Don't render settings if this is an unsupported feature
        if (SETTINGS_UI[groupLabel].unsupported) {
            continue;
        }

        const settingItems = SETTINGS_UI[groupLabel].items;
        for (let settingId of settingItems) {
            // Don't render custom settings
            if (!settingId) {
                continue;
            }

            const setting = Preferences.SETTINGS[settingId];
            if (!setting) {
                continue;
            }

            let settingLabel = setting.label;
            let settingNote = setting.note || '';

            // Add Experimental text
            if (setting.experimental) {
                settingLabel = '🧪 ' + settingLabel;
                if (!settingNote) {
                    settingNote = t('experimental')
                } else {
                    settingNote = `${t('experimental')}: ${settingNote}`
                }
            }

            let $control: any;
            let $inpCustomUserAgent: HTMLInputElement;
            let labelAttrs: any = {
                tabindex: '-1',
            };

            if (settingId === PrefKey.USER_AGENT_PROFILE) {
                let defaultUserAgent = (window.navigator as any).orgUserAgent || window.navigator.userAgent;
                $inpCustomUserAgent = CE('input', {
                    id: `bx_setting_inp_${settingId}`,
                    type: 'text',
                    placeholder: defaultUserAgent,
                    'class': 'bx-settings-custom-user-agent',
                });
                $inpCustomUserAgent.addEventListener('change', e => {
                    const profile = $control.value;
                    const custom = (e.target as HTMLInputElement).value.trim();

                    UserAgent.updateStorage(profile, custom);
                    onChange(e);
                });

                $control = toPrefElement(PrefKey.USER_AGENT_PROFILE, (e: Event) => {
                    const value = (e.target as HTMLInputElement).value as UserAgentProfile;
                    let isCustom = value === UserAgentProfile.CUSTOM;
                    let userAgent = UserAgent.get(value as UserAgentProfile);

                    UserAgent.updateStorage(value);

                    $inpCustomUserAgent.value = userAgent;
                    $inpCustomUserAgent.readOnly = !isCustom;
                    $inpCustomUserAgent.disabled = !isCustom;

                    !(e.target as HTMLInputElement).disabled && onChange(e);
                });
            } else if (settingId === PrefKey.SERVER_REGION) {
                let selectedValue;

                $control = CE<HTMLSelectElement>('select', {
                        id: `bx_setting_${settingId}`,
                        title: settingLabel,
                        tabindex: 0,
                    });
                $control.name = $control.id;

                $control.addEventListener('change', (e: Event) => {
                    setPref(settingId, (e.target as HTMLSelectElement).value);
                    onChange(e);
                });

                selectedValue = PREF_PREFERRED_REGION;

                setting.options = {};
                for (let regionName in STATES.serverRegions) {
                    const region = STATES.serverRegions[regionName];
                    let value = regionName;

                    let label = `${region.shortName} - ${regionName}`;
                    if (region.isDefault) {
                        label += ` (${t('default')})`;
                        value = 'default';

                        if (selectedValue === regionName) {
                            selectedValue = 'default';
                        }
                    }

                    setting.options[value] = label;
                }

                for (let value in setting.options) {
                    const label = setting.options[value];

                    const $option = CE('option', {value: value}, label);
                    $control.appendChild($option);
                }

                // Select preferred region
                $control.value = selectedValue;
            } else {
                if (settingId === PrefKey.BETTER_XCLOUD_LOCALE) {
                    $control = toPrefElement(settingId, (e: Event) => {
                        localStorage.setItem('better_xcloud_locale', (e.target as HTMLSelectElement).value);
                        onChange(e);
                    });
                } else {
                    $control = toPrefElement(settingId, onChange);
                }
            }

            if (!!$control.id) {
                labelAttrs['for'] = $control.id;
            } else {
                labelAttrs['for'] = `bx_setting_${settingId}`;
            }

            // Disable unsupported settings
            if (setting.unsupported) {
                ($control as HTMLInputElement).disabled = true;
            }

            // Make disabled control elements un-focusable
            if ($control.disabled && !!$control.getAttribute('tabindex')) {
                $control.setAttribute('tabindex', -1);
            }

            const $label = CE('label', labelAttrs, settingLabel);
            if (settingNote) {
                $label.appendChild(CE('b', {}, settingNote));
            }
            const $elm = CE<HTMLElement>('div', {'class': 'bx-settings-row'},
                    $label,
                    $control,
                );

            $wrapper.appendChild($elm);

            // Add User-Agent input
            if (settingId === PrefKey.USER_AGENT_PROFILE) {
                $wrapper.appendChild($inpCustomUserAgent!);
                // Trigger 'change' event
                $control.disabled = true;
                $control.dispatchEvent(new Event('change'));
                $control.disabled = false;
            }
        }
    }

    // Setup Reload button
    $btnReload = createButton({
        label: t('settings-reload'),
        classes: ['bx-settings-reload-button'],
        style: ButtonStyle.FOCUSABLE | ButtonStyle.FULL_WIDTH | ButtonStyle.TALL,
        onClick: e => {
            window.location.reload();
            $btnReload.disabled = true;
            $btnReload.textContent = t('settings-reloading');
        },
    });
    $btnReload.setAttribute('tabindex', '0');

    $wrapper.appendChild($btnReload);

    // Donation link
    const $donationLink = CE('a', {
            'class': 'bx-donation-link',
            href: 'https://ko-fi.com/redphx',
            target: '_blank',
            tabindex: 0,
        }, `❤️ ${t('support-better-xcloud')}`);
    $wrapper.appendChild($donationLink);

    // Show Game Pass app version
    try {
        const appVersion = (document.querySelector('meta[name=gamepass-app-version]') as HTMLMetaElement).content;
        const appDate = new Date((document.querySelector('meta[name=gamepass-app-date]') as HTMLMetaElement).content).toISOString().substring(0, 10);
        $wrapper.appendChild(CE<HTMLElement>('div', {'class': 'bx-settings-app-version'}, `xCloud website version ${appVersion} (${appDate})`));
    } catch (e) {}

    $container.appendChild($wrapper);

    // Add Settings UI to the web page
    const $pageContent = document.getElementById('PageContent');
    $pageContent?.parentNode?.insertBefore($container, $pageContent);
}
