/* global chrome */
import React, { useEffect, useState } from "react";
import { deepCopy, getUniqueId } from "../common/utils/utils";
import { Modal } from "../common/components/modals/Modal";
import { ByUrlType } from "./ByUrl";
import { GroupType } from "./Group";
import { ByWordType } from "./ByWord";
import { ButtonWithIcon } from "./ButtonWithIcon.js";
import PageManagerStyles from "./PageManager.module.css";

const Types = { group: "1", byUrl: "2", byWord: "3" };
Object.freeze(Types);

function TimeEntry(props) {
    const unique_id = getUniqueId("date-entry");
    return (
        <div class={PageManagerStyles.page_manager__form__field}>
            <label htmlFor={unique_id}>{props.label}</label>
            <input
                id={unique_id}
                class={PageManagerStyles.page_manager__form__field__value}
                name="type"
                type="time"
                value={props.value}
                onChange={props.onChange}
            />
        </div>
    );
}

function RaddioButton(props) {
    const unique_id = getUniqueId("radio-button");
    return (
        <div class={PageManagerStyles.page_manager__form__field}>
            <label htmlFor={unique_id}>{props.label}</label>
            <input
                id={unique_id}
                class={PageManagerStyles.page_manager__form__field__value}
                name="type"
                type="radio"
                value={props.value}
                onChange={props.onChange}
                checked={props.checked}
            />
        </div>
    );
}

function AdvancedSettingsForm(props) {
    return (
        <fieldset>
            <TimeEntry label="Start time" value={props.data.startTime} onChange={props.onChange("startTime")} />
            <TimeEntry label="End time (Testing)" value={props.data.endTime} onChange={props.onChange("endTime")} />
        </fieldset>
    );
}

function PageManagerModal(props) {
    const [validationErrorMessage, setValidationErrorMessage] = useState(null);
    const handleSubmit = (event) => {
        event.preventDefault();
        if (
            !Object.values(Types).includes(props.data.type) ||
            (props.data.type === Types.byUrl && !props.data.url) ||
            (props.data.type === Types.group && !props.data.name) ||
            (props.data.type === Types.byWord && !props.data.word)
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
    const handleChange = (dictKey) => {
        return function (event) {
            let newData = deepCopy(props.data);
            const val = event.target.value;
            if (dictKey === "type") {
                const defaultData = {
                    [Types.byUrl]: { type: Types.byUrl, url: null, startTime: null, endTime: null },
                    [Types.group]: { type: Types.group, name: null, isRoot: false, children: [], startTime: null, endTime: null },
                    [Types.byWord]: { type: Types.byWord, word: null, startTime: null, endTime: null },
                };
                if (Object.keys(defaultData).includes(val)) {
                    newData = defaultData[val];
                } else {
                    console.error("UnexpectedResult: type is not known.");
                }
            } else if (Object.keys(newData).includes(dictKey)) {
                newData[dictKey] = val;
            } else {
                console.error("UnexpectedResult: dictKey is not known.");
            }
            props.onChange(newData);
        }
    }
    if (!Object.values(Types).includes(props.data.type) && props.data.type !== undefined) {
        console.error("UnexpectedResult: props.data.type is not known.");
    }
    return (
        <Modal>
            <form onSubmit={handleSubmit} onReset={handleCancel}>
                <h2 class={PageManagerStyles.page_manager__form__title}>Create new entry</h2>
                <fieldset>
                    <RaddioButton label="By URL" value={Types.byUrl} checked={Types.byUrl === props.data.type} onChange={handleChange("type")} />
                    <RaddioButton label="By Word" value={Types.byWord} checked={Types.byWord === props.data.type} onChange={handleChange("type")} />
                    <RaddioButton label="Group" value={Types.group} checked={Types.group === props.data.type} onChange={handleChange("type")} />
                </fieldset>
                {props.data.type === Types.byUrl && (
                    <ByUrlType.Form onChange={handleChange} data={props.data} />
                )}
                {props.data.type === Types.group && (
                    <GroupType.Form onChange={handleChange} data={props.data} />
                )}
                {props.data.type === Types.byWord && (
                    <ByWordType.Form onChange={handleChange} data={props.data} />
                )}
                {validationErrorMessage && (
                    <span class={PageManagerStyles.page_manager__form__validation_error_message}>
                        {validationErrorMessage}
                    </span>
                )}
                {props.data.type && <AdvancedSettingsForm onChange={handleChange} data={props.data} />}
                <div class={PageManagerStyles.page_manager__form__buttons_box}>
                    <input type="submit" value="Ok" class={PageManagerStyles.page_manager__form__submit_button} />
                    <input type="reset" value="Cancel" class={PageManagerStyles.page_manager__form__reset_button} />
                </div>
            </form>
        </Modal>
    );
}

class PageTree {
    // Constructor
    constructor(newValue) {
        if (!newValue || !(newValue.name || newValue.url || newValue.word)) {
            throw new Error("PageTree : newValue is null");
        }
        for (let key of Object.keys(newValue)) {
            this[key] = newValue[key];
        }
        if (this.children) {
            this.children = this.children.map(child => new PageTree(child))
        }
    }

    // Parser helper
    static parsePathname(pathname) {
        const len = pathname.length;
        return [pathname.slice(0, len - 1), pathname[len - 1]];
    }
    getNodeIndex(name) {
        if (!this.children) {
            return -1;
        }
        return this.children
            .map((e) => e.name || e.word || e.url)
            .indexOf(name);
    }

    // From node
    getNode(name) {
        const index = this.getNodeIndex(name);
        if (index === -1) {
            throw new Error("PageTree : Incorrectly accessed unexistent child with getNode");
        }
        return this.children[index];
    }
    upsertNode(name, newValue) {
        if (!this.children) {
            throw new Error("PageTree : Called upsertNode method in node with no children");
        }
        const nodeToInsert = new PageTree(newValue);
        const index = this.getNodeIndex(name);
        if (index === -1) {
            this.children.push(nodeToInsert);
        } else {
            this.children[index] = nodeToInsert;
        }
    }
    deleteNode(name) {
        if (!this.children) {
            throw new Error("PageTree : Called deleteNode method in node with no children");
        }
        const index = this.getNodeIndex(name);
        this.children.splice(index, 1);
    }

    // From pathname functions
    getNodeFromPathname(pathname) {
        let currentNode = this;
        for (let name of pathname) {
            currentNode = currentNode.getNode(name);
        }
        return currentNode;
    }
    upsertNodeFromPathname(pathname, newValue) {
        const [path, name] = PageTree.parsePathname(pathname)
        this.getNodeFromPathname(path).upsertNode(name, newValue);
    }
    deleteNodeFromPathname(pathname) {
        const [path, name] = PageTree.parsePathname(pathname);
        this.getNodeFromPathname(path).deleteNode(name);
    }

    // Others
    getDeepCopy() {
        return new PageTree(deepCopy(this));
    }
}

function PageManagerView(props) {
    const currentNode = props.root.getNodeFromPathname(props.path);
    return (
        <div>
            <span>{[props.root.name].concat(props.path).join("/")}</span>
            <div style={{ float: "right" }}>
                {!currentNode.isRoot && (
                    <ButtonWithIcon label="Go back" code="chevron-left" onClick={props.onGoBackButton} className={PageManagerStyles.page_manager__top__icon_buttons} />
                )}
                <ButtonWithIcon label="Add" code="plus" onClick={props.onAddButton} className={PageManagerStyles.page_manager__top__icon_buttons} />
                {!currentNode.isRoot && (
                    <ButtonWithIcon label="Delete" code="window-close" onClick={props.onDeleteButtonClick} className={PageManagerStyles.page_manager__top__icon_buttons} />
                )}
            </div>
            <ul className={PageManagerStyles.page_manager__rule_list}>
                {currentNode.children.map((child, index) => (
                    <li key={index}>
                        {child.type === Types.group && (
                            <GroupType.View
                                name={child.name}
                                onGoButtonClick={props.onGoChildButtonClick(child.name)}
                                onEditButtonClick={props.onEditChildButtonClick(child.name)}
                                onDeleteButtonClick={props.onDeleteChildButtonClick(child.name)}
                            />
                        )}
                        {child.type === Types.byUrl && (
                            <ByUrlType.View
                                url={child.url}
                                onEditButtonClick={props.onEditChildButtonClick(child.url)}
                                onDeleteButtonClick={props.onDeleteChildButtonClick(child.url)}
                            />
                        )}
                        {child.type === Types.byWord && (
                            <ByWordType.View
                                word={child.word}
                                onEditButtonClick={props.onEditChildButtonClick(child.word)}
                                onDeleteButtonClick={props.onDeleteChildButtonClick(child.word)}
                            />
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function PageManager() {
    // Set state variables
    const [root, setRoot] = useState(new PageTree({ type: Types.group, name: "All pages", isRoot: true, children: [] }));
    const [modal, setModal] = useState(null);
    const [path, setPath] = useState([]);

    // Storage functions
    useEffect(() => {
        console.info("Loading data from storage")
        chrome.storage.local.get("blockedPages", (result) => {
            setRoot(new PageTree(result.blockedPages));
        });
    }, []);
    useEffect(() => {
        console.info("Saving data to storage")
        chrome.storage.local.set(
            { blockedPages: root }
        );
    }, [root])

    // Modal functions
    function openModal(mode) {
        return function (path) {
            let startingData = mode === "edit" ? root.getNodeFromPathname(path) : {};
            setModal({
                mode: mode,
                target: path,
                data: startingData,
            });
        }
    }
    function submitModal() {
        const mode = modal.mode;
        const data = modal.data;
        const target = modal.target;
        setRoot((prevRoot) => {
            let newRoot = prevRoot.getDeepCopy();
            let pathname = {
                "add": target.concat([data.name || data.word || data.url]),
                "edit": target
            }[mode];
            newRoot.upsertNodeFromPathname(pathname, data);
            return newRoot;
        });
        setModal(null);
    }
    function cancelModal() {
        setModal(null);
    }
    function updateModalData(newData) {
        setModal((prevModal) => ({
            ...prevModal,
            data: newData
        }));
    }

    // Navigation buttons
    function handleChildGoButtonClick(name) {
        return function () {
            setPath(path.concat([name]));
        }
    }
    function handleGoBackButton() {
        setPath(path.slice(0, -1));
    }

    // Create/Edit buttons
    function handleAddButtonClick() {
        openModal("add")(path);
    }
    function handleChildEditButtonClick(name) {
        return function () {
            openModal("edit")(path.concat(name));
        }
    }

    // Delete buttons
    function handleDeleteButtonClick() {
        const currentPath = path;
        setRoot((prevRoot) => {
            let newRoot = prevRoot.getDeepCopy();
            newRoot.deleteNodeFromPathname(currentPath);
            return newRoot;
        });
        setPath((prevPath) => prevPath.slice(0, -1));
    }
    function handleChildDeleteButtonClick(name) {
        return function () {
            setRoot((prevRoot) => {
                let newRoot = prevRoot.getDeepCopy();
                newRoot.deleteNodeFromPathname(path.concat(name));
                return newRoot;
            });
        }
    }

    // Render
    return (
        <div className={PageManagerStyles.page_manager}>
            {modal && (
                <PageManagerModal
                    onSubmit={submitModal}
                    onCancel={cancelModal}
                    onChange={updateModalData}
                    data={modal.data}
                />
            )}
            <PageManagerView
                path={path}
                root={root}
                onGoBackButton={handleGoBackButton}
                onAddButton={handleAddButtonClick}
                onDeleteButtonClick={handleDeleteButtonClick}
                onGoChildButtonClick={handleChildGoButtonClick}
                onEditChildButtonClick={handleChildEditButtonClick}
                onDeleteChildButtonClick={handleChildDeleteButtonClick}
            />
        </div>
    );
}

export default PageManager;
