/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as azdata from 'azdata';
import * as nls from 'vscode-nls';
import { ResourceHostType } from '../interfaces';
import { IResourceTypeService } from '../services/resourceTypeService';
import { DialogBase } from './dialogBase';

const localize = nls.loadMessageBundle();

export class ResourceHostTypePickerDialog extends DialogBase {
	private _selectedResourceType: ResourceHostType = null;
	private _view!: azdata.ModelView;
	private _resourceDescriptionLabel!: azdata.TextComponent;
	private _cardGroup!: azdata.RadioCardGroupComponent;

	constructor(
		private resourceTypeService: IResourceTypeService,
		private _resourceTypeNameFilters?: string[]) {
		super(localize('resourceTypePickerDialog.title', "Where would like to host SQL server?"), 'ResourceTypePickerDialog', true);
		this._dialogObject.okButton.label = localize('deploymentDialog.OKButtonText', "Select");
		this._dialogObject.okButton.enabled = false; // this is enabled after all tools are discovered.
	}

	initialize() {
		let tab = azdata.window.createTab('');
		this._dialogObject.registerCloseValidator(() => {
			const isValid = this._selectedResourceType !== undefined;
			return isValid;
		});
		tab.registerContent((view: azdata.ModelView) => {
			this._view = view;
			const resourceTypes = this.resourceTypeService
				.getResourceHostTypes()
				.filter(rt => !this._resourceTypeNameFilters || this._resourceTypeNameFilters.find(rtn => rt.name === rtn))
				.sort((a: ResourceHostType, b: ResourceHostType) => {
					return (a.displayIndex || Number.MAX_VALUE) - (b.displayIndex || Number.MAX_VALUE);
				});
			this._cardGroup = view.modelBuilder.radioCardGroup().withProperties<azdata.RadioCardGroupComponentProperties>({
				cards: resourceTypes.map((resourceType) => {
					return <azdata.RadioCard>{
						id: resourceType.name,
						label: resourceType.displayName,
					};
				}),
				iconHeight: '50px',
				iconWidth: '50px',
				cardWidth: '220px',
				cardHeight: '180px',
				ariaLabel: localize('deploymentDialog.deploymentOptions', "Deployment options"),
				width: '1100px'
			}).component();
			this._toDispose.push(this._cardGroup.onSelectionChanged((cardId: string) => {
				const resourceType = resourceTypes.find(rt => { return rt.name === cardId; });
				if (resourceType) {
					this.selectResourceType(resourceType);
				}
			}));
			this._resourceDescriptionLabel = view.modelBuilder.text().withProperties<azdata.TextComponentProperties>({ value: this._selectedResourceType ? this._selectedResourceType.description : undefined }).component();

			const formBuilder = view.modelBuilder.formContainer().withFormItems(
				[
					{
						component: this._cardGroup,
						title: ''
					}, {
						component: this._resourceDescriptionLabel,
						title: ''
					}
				],
				{
					horizontal: false
				}
			);

			const form = formBuilder.withLayout({ width: '100%' }).component();

			return view.initializeModel(form).then(() => {
				if (this._selectedResourceType) {
					this._cardGroup.selectedCardId = this._selectedResourceType.name;
				}
			});
		});
		this._dialogObject.content = [tab];
	}

	private selectResourceType(resourceHostType: ResourceHostType): void {
		this._selectedResourceType = resourceHostType;
		this._resourceDescriptionLabel.value = '';
		if (resourceHostType.options) {
			resourceHostType.options.forEach(option => {
				const optionLabel = this._view.modelBuilder.text().withProperties<azdata.TextComponentProperties>({
					value: option.displayName
				}).component();
				optionLabel.width = '150px';
			});
		}
	}
}