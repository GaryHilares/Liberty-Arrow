/* global chrome */
import React, { useState } from "react";
import { deepCopy, getUniqueId } from "../common/utils/utils";
import { Modal } from "../common/components/modals/Modal";
import { UniqueTypeForm, UniqueView } from "./Unique";
import { GroupTypeForm, GroupView } from "./Group";
import PageManagerStyles from "./PageManager.module.css";

const Types = { group: "1", unique: "2" };
Object.freeze(Types);

function PageManagerModal(props) {
    const [validationErrorMessage, setValidationErrorMessage] = useState(null);
    const handleSubmit = (event) => {
        event.preventDefault();
        if (
            !Object.values(Types).includes(props.data.type) ||
            (props.data.type === Types.unique && (!props.data.name || !props.data.url)) ||
            (props.data.type === Types.group && !props.data.name)
        ) {
            setValidationErrorMessage("Invalid data!");
        } else {
            props.onSubmit();
        }
    }
    const handleCancel = (event) => {
        event.preventDefault();
        props.onCancel();
    }
    const handleChange = (event) => {
        let newData = deepCopy(props.data);
        const dictKey = event.target.dataset.dictKey;
        const val = event.target.value;
        if (dictKey === "type") {
            const defaultData = {
                [Types.unique]: { type: Types.unique, name: null, url: null },
                [Types.group]: { type: Types.group, name: null, isRoot: false, childs: [] },
            };
            if (Object.keys(defaultData).includes(val)) {
                newData = defaultData[val];
            } else {
                console.error("UnexpectedResult: type is not known.");
            }
        } else if (!["type", "isRoot"].includes(dictKey) && Object.keys(newData).includes(dictKey)) {
            newData[dictKey] = val;
        } else {
            console.error("UnexpectedResult: dictKey is not known.");
        }
        props.onChange(newData);
    }
    if (!Object.values(Types).includes(props.data.type) && props.data.type !== undefined) {
        console.error("UnexpectedResult: props.data.type is not known.");
    }
    const type_unique_id = getUniqueId("type-unique");
    const type_group_id = getUniqueId("type-group");
    return (
        <Modal>
            <form onSubmit={handleSubmit} onReset={handleCancel}>
                <h2 class={PageManagerStyles.page_manager__form__title}>Create new entry</h2>
                <fieldset>
                    {[
                        { name: "Unique", id: type_unique_id, type: Types.unique },
                        { name: "Group", id: type_group_id, type: Types.group },
                    ].map(
                        (entry) => (
                            <div key={entry.id} class={PageManagerStyles.page_manager__form__field}>
                                <label htmlFor={entry.id}>{entry.name}</label>
                                <input
                                    id={entry.id}
                                    class={PageManagerStyles.page_manager__form__field__value}
                                    name="type"
                                    type="radio"
                                    data-dict-key="type"
                                    value={entry.type}
                                    onChange={handleChange}
                                    checked={entry.type === props.data.type}
                                />
                            </div>
                        )
                    )}
                </fieldset>
                {props.data.type === Types.unique && (
                    <UniqueTypeForm onChange={handleChange} data={props.data} />
                )}
                {props.data.type === Types.group && (
                    <GroupTypeForm onChange={handleChange} data={props.data} />
                )}
                {validationErrorMessage && (
                    <span class={PageManagerStyles.page_manager__form__validation_error_message}>
                        {validationErrorMessage}
                    </span>
                )}
                <div class={PageManagerStyles.page_manager__form__buttons_box}>
                    <input type="submit" value="Ok" class={PageManagerStyles.page_manager__form__submit_button} />
                    <input type="reset" value="Cancel" class={PageManagerStyles.page_manager__form__reset_button} />
                </div>
            </form>
        </Modal>
    );
}

class PageGroupView extends React.Component {
    constructor(props) {
        super(props); // root,  addNode (path), editNode (path), deleteNode (path),
        this.state = { currentNode: props.root, path: [props.root.name] };
        this.handleChildClick = this.handleChildClick.bind(this);
        this.handleGoBackButtonClick = this.handleGoBackButtonClick.bind(this);
        this.handleDeleteButtonClick = this.handleDeleteButtonClick.bind(this);
        this.handleChildDeleteButtonClick = this.handleChildDeleteButtonClick.bind(this);
        this.handleAddButtonClick = this.handleAddButtonClick.bind(this);
        this.handleEditButtonClick = this.handleEditButtonClick.bind(this);
    }
    static getNodeFromDirection(root, direction) {
        for (let rulename of direction.slice(1)) {
            root =
                root.childs[
                root.childs
                    .map((e) => {
                        return e.name;
                    })
                    .indexOf(rulename)
                ];
        }
        return root;
    }
    static deleteNodeFromDirection(root, direction) {
        root = PageGroupView.getNodeFromDirection(root, direction.slice(0, direction.length - 1));
        const names = root.childs.map((e) => e.name);
        const name = direction[direction.length - 1];
        let index = names.indexOf(name);
        root.childs.splice(index, 1);
    }
    static setNodeFromDirection(root, direction, newValue) {
        root = PageGroupView.getNodeFromDirection(root, direction.slice(0, direction.length - 1));
        const names = root.childs.map((e) => {
            return e.name;
        });
        const name = direction[direction.length - 1];
        let index = names.indexOf(name);
        if (index === -1) root.childs.push(newValue);
        else root.childs[index] = newValue;
    }
    handleChildClick(event) {
        let childName = event.target.dataset.pagename;
        this.setState((prevState) => {
            const newPath = prevState.path.concat([childName]);
            return {
                path: newPath,
                currentNode: PageGroupView.getNodeFromDirection(this.props.root, newPath),
            };
        });
    }
    handleGoBackButtonClick() {
        this.setState((prevState) => {
            const newPath = prevState.path.slice(0, prevState.path.length - 1);
            return {
                path: newPath,
                currentNode: PageGroupView.getNodeFromDirection(this.props.root, newPath),
            };
        });
    }
    handleDeleteButtonClick() {
        this.props.deleteNode(this.state.path, () => {
            this.setState((prevState) => {
                const newPath = prevState.path.slice(0, prevState.path.length - 1);
                return {
                    path: newPath,
                    currentNode: PageGroupView.getNodeFromDirection(this.props.root, newPath),
                };
            });
        });
    }
    handleChildDeleteButtonClick(event) {
        let childName = event.target.dataset.pagename;
        this.props.deleteNode(this.state.path.concat([childName]), () => { });
    }
    componentDidUpdate(prevProps) {
        if (prevProps.root !== this.props.root) {
            this.setState({
                path: this.state.path,
                currentNode: PageGroupView.getNodeFromDirection(this.props.root, this.state.path),
            });
        }
    }
    handleEditButtonClick(event) {
        const path = event.target.dataset.pagename
            ? this.state.path.concat([event.target.dataset.pagename])
            : this.state.path;
        this.props.editNode(path);
    }
    handleAddButtonClick() {
        const path = this.state.path;
        this.props.addNode(path);
    }
    render() {
        return (
            <div>
                <span>{this.state.path.join("/")}</span>
                <div style={{ float: "right" }}>
                    {!this.state.currentNode.isRoot && (
                        <i
                            aria-label="Go back"
                            className={`las la-chevron-left ${PageManagerStyles.page_manager__top__icon_buttons}`}
                            onClick={this.handleGoBackButtonClick}
                        ></i>
                    )}
                    <i
                        aria-label="Add"
                        className={`las la-plus ${PageManagerStyles.page_manager__top__icon_buttons}`}
                        onClick={this.handleAddButtonClick}
                    ></i>
                    {/*!this.state.currentNode.isRoot && <button onClick={this.handleEditButtonClick}>Edit</button>*/}
                    {!this.state.currentNode.isRoot && (
                        <i
                            aria-label="Delete"
                            className={`las la-window-close" ${PageManagerStyles.page_manager__top__icon_buttons}`}
                            onClick={this.handleDeleteButtonClick}
                        ></i>
                    )}
                </div>
                <ul className={PageManagerStyles.page_manager__rule_list}>
                    {this.state.currentNode.childs.map((child, index) => (
                        <li key={index}>
                            {child.type === Types.group && (
                                <GroupView
                                    name={child.name}
                                    onGoButtonClick={this.handleChildClick}
                                    onEditButtonClick={this.handleEditButtonClick}
                                    onDeleteButtonClick={this.handleChildDeleteButtonClick}
                                />
                            )}
                            {child.type === Types.unique && (
                                <UniqueView
                                    name={child.name}
                                    url={child.url}
                                    onEditButtonClick={this.handleEditButtonClick}
                                    onDeleteButtonClick={this.handleChildDeleteButtonClick}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }
}

class PageManager extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            root: { type: Types.group, name: "All pages", isRoot: true, childs: [] },
            modal: null,
        };
        chrome.storage.local.get("blockedPages", (result) => {
            this.setState({ root: result.blockedPages });
            console.info("Data loaded!");
        });
        this.addPage = this.addPage.bind(this);
        this.editPage = this.editPage.bind(this);
        this.deletePage = this.deletePage.bind(this);
        this.save = this.save.bind(this);
        this.handleModalSubmit = this.handleModalSubmit.bind(this);
        this.handleModalCancel = this.handleModalCancel.bind(this);
        this.handleModalChange = this.handleModalChange.bind(this);
    }
    addPage(path) {
        this.setState((prevState) => {
            return {
                root: prevState.root,
                modal: {
                    mode: "add",
                    targetAdress: path,
                    data: {},
                },
            };
        });
    }
    deletePage(path, callback) {
        this.setState(
            (prevState) => {
                let newRoot = deepCopy(prevState.root);
                PageGroupView.deleteNodeFromDirection(newRoot, path);
                return {
                    root: newRoot,
                    modal: prevState.modal,
                };
            },
            () => {
                this.save();
                callback();
            }
        );
    }
    editPage(path) {
        this.setState((prevState) => {
            return {
                root: prevState.root,
                modal: {
                    mode: "edit",
                    targetAdress: path,
                    data: PageGroupView.getNodeFromDirection(prevState.root, path),
                },
            };
        });
    }
    save() {
        chrome.storage.local.set({ blockedPages: this.state.root }, () => {
            console.info("Data saved sucessfully!");
        });
    }
    handleModalSubmit() {
        this.setState(
            (prevState) => {
                let newRoot = deepCopy(prevState.root);
                const mode = prevState.modal.mode;
                const data = prevState.modal.data;
                let target = "";
                switch (mode) {
                    case "add":
                        target = prevState.modal.targetAdress.concat([data.name]);
                        break;
                    case "edit":
                        target = prevState.modal.targetAdress;
                        break;
                    default:
                        break;
                }
                PageGroupView.setNodeFromDirection(newRoot, target, data);
                return {
                    root: newRoot,
                    modal: null,
                };
            },
            () => {
                this.save();
            }
        );
    }
    handleModalCancel() {
        this.setState((prevState) => {
            return {
                root: prevState.root,
                modal: null,
            };
        });
    }
    handleModalChange(newData) {
        this.setState((prevState) => {
            return {
                root: prevState.root,
                modal: {
                    targetAdress: prevState.modal.targetAdress,
                    mode: prevState.modal.mode,
                    data: newData,
                },
            };
        });
    }
    render() {
        return (
            <div className={PageManagerStyles.page_manager}>
                {this.state.modal && (
                    <PageManagerModal
                        onSubmit={this.handleModalSubmit}
                        onCancel={this.handleModalCancel}
                        onChange={this.handleModalChange}
                        data={this.state.modal.data}
                    />
                )}
                <PageGroupView
                    root={this.state.root}
                    addNode={this.addPage}
                    editNode={this.editPage}
                    deleteNode={this.deletePage}
                />
            </div>
        );
    }
}

export default PageManager;
