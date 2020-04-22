import './button.less';

import { UIElement } from '../element';
import {
	CanUndef,
	IUIButton,
	IUIButtonState,
	IUIButtonStatePartial,
	IViewBased
} from '../../../types';
import watch from '../../../core/decorators/watch';
import { STATUSES } from '../../component';
import { Dom } from '../../dom';
import { css, attr, isString } from '../../helpers';
import { Icon } from '../icon';
import { UIList } from '..';

export const UIButtonState = (): IUIButtonState => ({
	size: 'middle',
	status: '',
	disabled: false,
	activated: false,
	icon: {
		name: 'empty',
		fill: '',
		iconURL: ''
	},
	tooltip: '',
	text: ''
});

export class UIButton extends UIElement implements IUIButton {
	/**
	 * Marker for buttons
	 */
	isButton: true = true;

	state = UIButtonState();

	/**
	 * Set state
	 * @param state
	 */
	setState(state: IUIButtonStatePartial): this {
		Object.assign(this.state, state);
		return this;
	}

	/**
	 * DOM container for text content
	 */
	text!: HTMLElement;

	/**
	 * DOM container for icon
	 */
	icon!: HTMLElement;

	@watch('state.size')
	protected onChangeSize(): void {
		this.setMod('size', this.state.size);
	}

	/**
	 * Set size from parent list
	 */
	@watch('parentElement')
	protected updateSize(): void {
		let pe = this.closest(UIList) as UIList;

		if (pe) {
			this.state.size = pe.buttonSize;
			return;
		}

		this.state.size = this.j.o.toolbarButtonSize || UIButtonState().size;
	}

	@watch('state.status')
	protected onChangeStatus(): void {
		this.setMod('status', this.state.status);
	}

	@watch('state.text')
	protected onChangeText(): void {
		this.text.textContent = this.j.i18n(this.state.text);
	}

	@watch('state.text')
	protected onChangeTextSetMode(): void {
		this.setMod('text-icons', Boolean(this.state.text.trim().length));
	}

	@watch('state.disabled')
	protected onChangeDisabled(): void {
		attr(this.container, 'disabled', this.state.disabled || null);
	}

	@watch('state.activated')
	protected onChangeActivated(): void {
		attr(this.container, 'aria-pressed', this.state.activated);
	}

	@watch('state.tooltip')
	protected onChangeTooltip(): void {
		if (this.j.o.useNativeTooltip) {
			attr(this.container, 'title', this.state.tooltip);
		}

		attr(this.container, 'aria-label', this.state.tooltip);
	}

	@watch('state.icon')
	protected onChangeIcon(): void {
		if (this.j.o.textIcons) {
			return;
		}

		Dom.detach(this.icon);

		const { jodit, state } = this;

		let iconElement: CanUndef<HTMLElement> = undefined;

		if (state.icon) {
			if (state.icon.iconURL) {
				iconElement = jodit.c.span();

				css(
					iconElement,
					'backgroundImage',
					'url(' +
						state.icon.iconURL.replace(
							'{basePath}',
							jodit.basePath
						) +
						')'
				);
			} else {
				const svg = Icon.get(this.state.icon.name, '');

				if (svg) {
					iconElement = this.j.c.fromHTML(svg.trim());
					iconElement.classList.add(
						'jodit-icon_' + this.clearName(this.state.icon.name)
					);
				}
			}
		}

		if (iconElement) {
			iconElement.classList.add('jodit-icon');
			iconElement.style.fill = state.icon.fill;

			this.icon.appendChild(iconElement);
		}
	}

	/**
	 * Set focus on element
	 */
	focus() {
		this.container.focus();
	}

	/**
	 * Element has focus
	 */
	isFocused(): boolean {
		const { activeElement } = this.j.od;

		return Boolean(
			activeElement && Dom.isOrContains(this.container, activeElement)
		);
	}

	/** @override */
	protected createContainer(): HTMLElement {
		let tabIndex = -1;

		if (this.j.o.allowTabNavigation) {
			tabIndex = 0;
		}
		const cn = this.componentName;

		const button = this.j.c.element('button', {
			class: cn,
			type: 'button',
			role: 'button',
			tabIndex,
			ariaPressed: false
		});

		this.icon = this.j.c.span(cn + '__icon');
		this.text = this.j.c.span(cn + '__text');

		button.appendChild(this.icon);
		button.appendChild(this.text);

		this.j.e.on(button, `click`, this.onActionFire.bind(this));

		return button;
	}

	constructor(jodit: IViewBased) {
		super(jodit);

		this.initTooltip();
		this.updateSize();
		this.onChangeSize();
		this.onChangeStatus();

		if (this.constructor.name === UIButton.name) {
			this.setStatus(STATUSES.ready);
		}
	}

	destruct(): any {
		this.j.e.off(this.container);
		return super.destruct();
	}

	/**
	 * Add tooltip to button
	 */
	protected initTooltip() {
		if (this.j.o.showTooltip && !this.j.o.useNativeTooltip) {
			const to = this.j.o.showTooltipDelay || this.j.defaultTimeout;

			let timeout: number = 0;

			this.j.e
				.on(this.container, 'mouseenter', () => {
					if (!this.state.tooltip) {
						return;
					}

					timeout = this.j.async.setTimeout(
						() =>
							!this.state.disabled &&
							this.j?.e.fire(
								'showTooltip',
								this.container,
								this.state.tooltip
							),
						{
							timeout: to,
							label: 'tooltip'
						}
					);
				})
				.on(this.container, 'mouseleave', () => {
					this.j.async.clearTimeout(timeout);
					this.j.e.fire('hideTooltip');
				});
		}
	}

	private actionHandlers: Function[] = [];

	/**
	 * Add action handler
	 * @param originalEvent
	 */
	onAction(callback: (originalEvent: MouseEvent) => void): this {
		this.actionHandlers.push(callback);
		return this;
	}

	/**
	 * Fire all click handlers
	 * @param originalEvent
	 */
	private onActionFire(originalEvent: MouseEvent): void {
		this.actionHandlers.forEach(callback =>
			callback.call(this, originalEvent)
		);
	}
}

export function Button(jodit: IViewBased, icon: string): IUIButton;
export function Button(
	jodit: IViewBased,
	icon: string,
	text: string,
	status?: string
): IUIButton;
export function Button(
	jodit: IViewBased,
	state: IUIButtonStatePartial,
	status?: string
): IUIButton;
export function Button(
	jodit: IViewBased,
	stateOrText: string | IUIButtonStatePartial,
	text?: string,
	status?: string
): IUIButton {
	const button = new UIButton(jodit);

	if (isString(stateOrText)) {
		button.state.icon.name = stateOrText;

		if (status) {
			button.state.status = status;
		}

		if (text) {
			button.state.text = text;
		}
	} else {
		button.setState(stateOrText);
	}

	return button;
}