/**
 * @fileoverview Defined the CTATDragSource component, a CTAT component that
 * supports bucket sorting type tasks. To set up a CTATDragSource, use the following
 * example:
 * <div id="source" class="CTATDragSource"><div>your item1</div>...</div>
 * id and class attributes are required. If no name attribute is provided, the
 * default one will be set. The name attribute is used to group CTATDragSource's
 * into groups that allow passing of items only between group memebers.
 * The data-ctat-max-cardinality attribute can be set with an integer and the
 * CTATDragSource will reject drops if there is already that many items or more.
 * Child items should be given an id attribute with a unique identifier. If one
 * is not supplied, then CTATDragSource will generate one for each child without
 * an id attribute, but it is unrealistic to expect that the generated names
 * will be universally consistent.
 *
 *  @author: $Author: mdb91 $
 *  @version: $Revision: 24369 $
 */

/*
 * TODO: feedback indicating valid drop cite fullness?
 */
goog.provide('CTATDragSource');

goog.require('CTAT.Component.Base.Tutorable');
goog.require('CTAT.ComponentRegistry');
goog.require('CTATGlobalFunctions');
goog.require('CTATSAI');

/**
 *
 */
CTATDragSource = function() {
	CTAT.Component.Base.Tutorable.call(this, "CTATDragSource", "aDnD");

	/******************* Component Parameters ***********************/
	//Group Name
	this.setParameterHandler('groupname', function(aName) {
		if (this.getDivWrap()) $(this.getDivWrap()).attr('name',aName);
	});
	// No this.data_ctat_handlers, use "name" instead.

	// Max Number of Objects
	this.set_child_limit = function(aNum) {
		var val = parseInt(aNum);
		if (!isNaN(val)) $(this.component).attr('data-ctat-max-cardinality', val);
	};
	this.setParameterHandler('MaxObjects', this.set_child_limit);
	this.get_child_limit = function() {
		var lim = parseInt($(this.component).attr('data-ctat-max-cardinality'));
		return isNaN(lim)?-1:lim;
	};

	//this.data_ctat_handlers['max-cardinality'] = this.set_child_limit;

	//set purpose of the dragSource component
	this.set_purpose = function(aNum) {
		switch (aNum) {
			case 1: //destination
				this.className += " sink";
	      		break;
	    	case 2: //trashcan
	      		this.className += " trashcan";
	      		break;
	    	case 3: //source
	      		this.className += " source";
	      		break;
	    }
	};
	  
	this.get_purpose =function(){
	    if (this.classList.contains("sink")) {
	      	return "sink";
	    }
	    else if (this.classList.contains("trashcan")){
	      	return "trashcan";
	    }
	    else {
	      	return "source";
	    }
	 };

	/***************** Event handlers ******************/
	var hash = function (s) {
		return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0); return a&a;},0);
	};

	var handle_drag_start = function (e) {
		//add a new element to the source

		//console.log('Starting to drag '+e.target.id);
		var groupname = $(this).parent().attr('name');
		var parent = $(this).parent().attr('id');
		e.dataTransfer.setData('ctat/group', groupname); // encoding into type does not work as it will be forced lowercase
		e.dataTransfer.setData('ctat/source', parent);
		e.dataTransfer.setData('source', this.id);
		//e.dataTransfer.setData('length', this.childNodes.length);

		if (document.getElementById(parent).classList.contains("source")){  
			var cloneId = this.id + CTATGlobalFunctions.gensym.div_id().slice(7);

			//var clone = document.getElementById(this.id).cloneNode(true);
			//clone.id = cloneId;
			//document.getElementById(parent).append(clone);
			//clone.style.visibility = "hidden";

			e.dataTransfer.setData('text', cloneId);
			var hid = hash(cloneId);
			e.dataTransfer.setData('ctat/id/'+hid,hid);
			CTATDragSource.dragging[hid] = {
				id: cloneId,
				group: groupname,
				source: parent
			};
		}
		else {
			e.dataTransfer.setData('text', this.id);
			var hid = hash(this.id);
			e.dataTransfer.setData('ctat/id/'+hid,hid);
			CTATDragSource.dragging[hid] = {
					id: this.id,
					group: groupname,
					source: parent
			};
		}
		
	};

	var handle_drag_end = function (e) {
		var dndid;
		for (var i=0; i<e.dataTransfer.types.length; i++) {
			//console.log(e.dataTransfer.types[i]);
			dndid = /^ctat\/id\/(.+)$/.exec(e.dataTransfer.types[i]);
			if (dndid) {
				var hid = dndid[1];
				if (CTATDragSource.dragging.hasOwnProperty(hid)) {
					// removed hash indexed information about this draggable
					delete CTATDragSource.dragging[hid];
				}
			}
		}
	};
	/********************* Initialization ************************/
	
	var dnd = null;
	this.init = function() {
		dnd = this.getDivWrap();
		if (!$(dnd).attr('name')) {
			var gname = CTATDragSource.default_groupname;
			if (this.getComponentGroup()) {
				gname = this.getComponentGroup();
			}
			$(dnd).attr('name',gname);
		}
		this.setComponent(dnd);
		// Do not need to re-parent any children or create a div
		// Not sure if this.addComponentReference(this,this.getDivWrap()) is required as it should not be tabbed
		CTATComponentReference.add(this,dnd); // Not sure we need CTATComponentReference in general...
		if (!CTATConfiguration.get('previewMode'))
		{
			$(dnd).children().addClass('CTATDragSource--item').attr({
				unselectable:'on',
				draggable: true,
			}).each(function(){
				// Add generated id if id does not exist!
				if (!this.id) this.id = CTATGlobalFunctions.gensym.div_id();
				this.addEventListener('dragstart',handle_drag_start,false);
				this.addEventListener('dragend',handle_drag_end,false);
				//this.addEventListener('dragenter');
			});
		}
		/**
		 * @listens dragover
		 */
		this.component.addEventListener('dragover', function(e) {
			/** @this dnd */
			var allow_drop = false;
			if ($(this).data('CTATComponent').getEnabled()) { // this causes rejection when disabled
				// check for child limit
				var limit = parseInt($(this).attr('data-ctat-max-cardinality'));
				if (isNaN(limit) || limit<0 || $(this).children().length<limit) {
					var types = new Set(e.dataTransfer.types); // DOMStringList but is marked as obsolete, so convert to set
					// check if it is from a CTATDragSource
					if (types.has('ctat/group')) {
						// check if in the same group and not source
						if (e.dataTransfer.getData('text')) { // see if in Firefox and can get data
							if (e.dataTransfer.getData('ctat/group') === $(this).attr('name') && // getData does not work in webkit
									e.dataTransfer.getData('ctat/source') !== this.id) {
								allow_drop = true;
							}
						} else { // get information from hash encoded store
							var dndid;
							for (var i=0; i<e.dataTransfer.types.length; i++) {
								//console.log(e.dataTransfer.types[i]);
								dndid = /^ctat\/id\/(.+)$/.exec(e.dataTransfer.types[i]);
								if (dndid) {
									var hid = dndid[1];
									//console.log(hid);
									if (CTATDragSource.dragging.hasOwnProperty(hid) &&
											CTATDragSource.dragging[hid].group === $(this).attr('name') &&
											CTATDragSource.dragging[hid].source !== this.id) {
										allow_drop = true;
									}
								}
							}
						}
					}
				}
			}
			//console.log("target id " + e.target.id);
			if (e.target.classList.contains("source")){ //dropping in source is
        		allow_drop = false;
      		}
			if (allow_drop) {
				e.preventDefault();
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.dropEffect = "move";
				this.classList.add('CTATDragSource--valid-drop');
				// add some component level indication of the target other than mouse icon?
			}
		}, false);

		/**
		 * @listens drop
		 */
		this.component.addEventListener('drop', function(e) {
			e.preventDefault();
			this.classList.remove('CTATDragSource--valid-drop');

			var comp = $(this).data('CTATComponent');
			if (comp.getEnabled()) { // accept things only when enabled.
				var item_id = e.dataTransfer.getData('text');
				var source_id = e.dataTransfer.getData('ctat/source');
				var item;
				//console.log('CTATDragSource '+e.target.id+' got drop '+item_id);

				if (document.getElementById(item_id)){
					item = document.getElementById(item_id);
					this.appendChild(item);
				}

				if (!document.getElementById(item_id)){
					var original = document.getElementById(e.dataTransfer.getData('source'));
					item = original.cloneNode(false);
					item.id = e.dataTransfer.getData('text');
					item.addEventListener('dragstart',handle_drag_start,false);
					item.addEventListener('dragend',handle_drag_end,false); //how about drops and others??

					//excerpt from mutationobserver and initializeHTMLComponent
					var componentType;
					var CTATClassRegex = /(CTAT[A-z]*)(\s|$)/g;
					var ctatClass = CTATClassRegex.exec(item.className)
					if (ctatClass){
						for (var i = 0; i < ctatClass.length; i++) {
				            if (CTAT.ComponentRegistry[ctatClass[i]]) {
				              componentType = ctatClass[i];
				            }
				        }
				    }
				    if (componentType){
				    	CTATTutor.initializeHTMLComponent(item, componentType);
				    }
				    this.append(item);

				    var oldLength = original.childNodes.length;
				    var newLength = item.childNodes.length;

				    if (oldLength === newLength){
				    	console.log("entered lengths equal");
				    	for (var i = 0; i < newLength; i++){
				    		item.childNodes[i].setAttribute('class', original.childNodes[i].className);
				    		item.childNodes[i].setAttribute('value',original.childNodes[i].value);
				    		item.childNodes[i].innerHTML = original.childNodes[i].innerHTML;

				    		original.childNodes[i].classList.remove("CTAT--correct");
				    		original.childNodes[i].classList.remove("CTAT--incorrect");
				    		original.childNodes[i].classList.remove("CTAT--hint");
				    		original.childNodes[i].value = "";
				    		//remove disable
				    	}
				    }
				    if (oldLength !== newLength){ //consider case of no children -> NaN or 0?
				    	console.log("entered lengths not equal");
				    	for (var i = 0; i < newLength; i++){
				    		item.removeChild(item.lastChild);
				    	}
				    	for (var ii = 0; ii < oldLength; ii++){
				    		item.appendChild(original.childNodes[ii].cloneNode(true));
				    	}
				    }
				}

					//if difference in child lengths, copy all child from original -> two cases (non ctat components and done ctat components)
					//else copy all values and classes from children over



				/* if jquery clone method works with deep copying children and event listeners
				if (!document.getElementById(item_id)){					
					//item = document.getElementById(e.dataTransfer.getData('source')).cloneNode(true);
					//add eevent listeners (drag etc)
					console.log('jquery called');
					$("#" + e.dataTransfer.getData('source')).clone(true, true).appendTo(this);
					item = this.lastChild;
					//item.id = e.dataTransfer.getData('text');
					
					//excerpt from mutationobserver and initializeHTMLComponent
					var divWrap = item;
					var componentType;
					var CTATClassRegex = /(CTAT[A-z]*)(\s|$)/g;
					var ctatClass = CTATClassRegex.exec(item.className)
					if (ctatClass){
						for (var i = 0; i < ctatClass.length; i++) {
				            if (CTAT.ComponentRegistry[ctatClass[i]]) {
				              componentType = ctatClass[i];
				            }
				        }
				    }

					//properties are set but component.init() not called so children are not created again
					//are there complications with SAI?
					if (componentType){
						var CTATComponentConstructor = CTAT.ComponentRegistry[componentType];
						var ctat_component = new CTATComponentConstructor;
						if ($(divWrap).attr("id")) {
						  ctat_component.setName($(divWrap).attr("id"));
						} else {
						  divWrap.setAttribute("id", CTATGlobalFunctions.gensym.div_id());
						  ctat_component.setName(divWrap.getAttribute("id"));
						}
						ctat_component.setDivWrapper(divWrap);
						ctat_component.processAttributes();
						//ctat_component.init();
						ctat_component.processTabOrder();
						ctat_component.setEnabled(ctat_component.getEnabled());
						if (ctat_component.isFeedbackComponent() == false) {
						  var compEntry = new CTATComponentDescription;
						  compEntry.type = ctat_component.getClassName();
						  compEntry.name = ctat_component.getName();
						  compEntry.setComponentPointer(ctat_component);
						  CTATShellTools.registerComponentDescription(compEntry);
						}
						$(divWrap).data("CTATComponent", ctat_component);

						if (CTATConfiguration.get("previewMode")) {
						  var restore = ctat_component.getDivWrap().getAttribute("data-ctat-enabled");
						  var isEnabled = ctatEnabledInPreview[ctat_component.getClassName()];
						  if (!isEnabled) {
						    isEnabled = false;
						  }
						  ctat_component.setEnabled(isEnabled);
						  ctat_component.getDivWrap().setAttribute("data-ctat-enabled", restore);
						}
					}
					*/

				if (this.classList.contains('trashcan')){
					this.removeChild(item);
				}
				if (this.classList.contains('source')){
					this.removeChild(item);
				}
				if (this.classList.contains('sink')) {
					item.style.visibility="unset";
					$('#'+item_id).removeClass('CTAT--correct CTAT--incorrect CTAT--hint');
					comp.setActionInput('Add',item_id);
					//console.log(comp.getSAI().getSelection(),comp.getSAI().getAction(),comp.getSAI().getInput());
					comp.processAction();
				}
			}
		}, false);

		// needed for unhighlighting.
		this.component.addEventListener('dragleave', function(e) {
			this.classList.remove('CTATDragSource--valid-drop');
		}, false);
		this.setInitialized(true);
	};
	/**
	 * This is run during the generation of InterfaceDescription messages and
	 * it generates interface actions for options set by the author in the
	 * html code.
	 * @returns {Array<CTATSAI>} of SAIs.
	 */
	this.getConfigurationActions = function () {
		var actions = [];
		var items = [];
		$(this.component).children().each(function() {
			items.push($(this).attr('id'));
		});
		if (items.length>0) {
			var sai = new CTATSAI();
			sai.setSelection(this.getName());
			sai.setAction('SetChildren');
			sai.setInput(items.sort().join(';'));
			actions.push(sai);
		}
	    return actions;
	};

	var super_setEnabled = this.setEnabled;
	this.setEnabled = function (bool) {
		super_setEnabled(bool);
		if (dnd) {
			$(dnd).children().attr('draggable',bool);
			if (this.getDisableOnCorrect()) {
				$(dnd).find('.CTAT--correct').attr('draggable',false);
			}
		}
	};
	/******************* Interface Actions **********************/
	/**
	 * Moves the entity with the given id to this component.
	 * @param {String} aId - the id of an entity in the dom.
	 * Note: this method tests if the entity has the CTAT-DragNDrop--item class
	 * and if it does not, it will add it, set some appropriate properties, and
	 * add appropriate event listeners.
	 */
	this.Add = function(aId) {
		var target = $('#'+aId);
		if (target.length>0) {
			target.appendTo(this.getDivWrap());
		}
		if (!$(target).hasClass('CTATDragSource--item')) {
			$(target).addClass('CTATDragSource--item').attr({
				unselectable:'on',
				draggable: true,
			});
			target.addEventListener('dragstart',handle_drag_start,false);
			target.addEventListener('dragend',handle_drag_end,false);
		}
	};
	/**
	 * Moves the entities with the given id's to this component.
	 * @param {String} aId - a ; deliminated list of id's of entities in the dom.
	 */
	this.SetChildren = function(list_of_ids) {
		list_of_ids.split(';').forEach(function (aId) {
			this.Add(aId);
		}, this);
	};

	/**************** Grading **************************/
	this.updateSAI = function() {
		var items = [];
		$(this.component).children().each(function() {
			items.push($(this).attr('id'));
		});
		//console.log('SetChildren',items.join(';'));
		this.setActionInput('SetChildren',items.sort().join(';'));
	};
	var super_showCorrect = this.showCorrect.bind(this);
	this.showCorrect = function(aSAI) {
		var action = aSAI.getAction();
		//console.log(this.getName(),'showCorrect',action);
		switch (action) {
		case "Add":
			this.setEnabled(true);
			var id = aSAI.getInput();
			$('#'+id).addClass('CTAT--correct');
			//console.log(this.getDisableOnCorrect());
			if (this.getDisableOnCorrect()) {
				$('#'+id).attr('draggable',false);
			}
			break;
		case "SetChildren":
		default:
			super_showCorrect(aSAI);
			break;
		}
	};
	var super_showInCorrect = this.showInCorrect.bind(this);
	this.showInCorrect = function(aSAI) {
		var action = aSAI.getAction();
		//console.log(this.getName(),'showInCorrect',action);
		switch (action) {
		case "Add":
			var id = aSAI.getInput();
			$('#'+id).addClass('CTAT--incorrect');
			break;
		case "SetChildren":
		default:
			super_showInCorrect(aSAI);
			break;
		}
	};
};

CTATDragSource.dragging = {};
CTATDragSource.default_groupname = 'DragNDropGroup';


CTATDragSource.prototype = Object.create(CTAT.Component.Base.Tutorable.prototype);
CTATDragSource.prototype.constructor = CTATDragSource;

CTAT.ComponentRegistry.addComponentType('CTATDragSource', CTATDragSource);
