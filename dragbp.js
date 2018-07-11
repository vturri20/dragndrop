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

		if (document.getElementById(parent).classList.contains("source")){
			console.log("reached clone");
	        var clone = document.createElement("div");
	        var genName = CTATGlobalFunctions.gensym.div_id().slice(7);
	        var cloneId = this.id + genName;

	        clone.setAttribute("id", cloneId);
	        clone.setAttribute("class", this.className);
	        clone.innerHTML = this.innerHTML;
	        clone.setAttribute("unselectable", "on");
	        clone.setAttribute("draggable", "true");
	        clone.addEventListener('dragstart',handle_drag_start,false)
	        clone.addEventListener('dragend',handle_drag_end,false);
	        if (clone.classList.contains("CTATTextInput")){
	        	clone.firstChild.value = this.firstChild.value;
	        	this.firstChild.value = "";
	        	this.firstChild.classList.remove("CTAT--incorrect");
	        	this.firstChild.classList.remove("CTAT--correct");
	        	this.firstChild.classList.remove("CTAT--hint");
	        }
	        
	        var cloneSource = document.getElementById(parent);
			cloneSource.append(clone);
			clone.style.visibility="hidden";

			
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
			/* @this CTATDragSource.component */
			e.preventDefault();
			this.classList.remove('CTATDragSource--valid-drop');

			var pointer = this;

			var comp = $(this).data('CTATComponent');
			if (comp.getEnabled()) { // accept things only when enabled.
				var item_id = e.dataTransfer.getData('text');
				var source_id = e.dataTransfer.getData('ctat/source');
				//console.log('CTATDragSource '+e.target.id+' got drop '+item_id);
				var item = document.getElementById(item_id);

				this.appendChild(item);
				console.log("drop id " + pointer.id);

				if (item.classList.contains('CTATTextInput')){
					item.firstChild.id = item.childNodes[1].id;
					item.removeChild(item.childNodes[1]);
					//item.childNodes[1].value = item.firstChild.value;
					//item.removeChild(item.firstChild);
				}

				if (pointer.classList.contains('trashcan')){
					this.removeChild(item);
				}
				if (pointer.classList.contains('source')){
					this.removeChild(item);
				}
				if (pointer.classList.contains('sink')) {
					item.style.visibility="unset";
					//console.log(this,item_id,item);
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
