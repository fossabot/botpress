import React, { Component } from 'react'
import classnames from 'classnames'
import axios from 'axios'
import _ from 'lodash'
import Dropzone from 'react-dropzone'

import List from './List'
import Manage from './Manage'
import CreateModal from './modal'

import ContentWrapper from '~/components/Layout/ContentWrapper'
import PageHeader from '~/components/Layout/PageHeader'

const style = require('./style.scss')

const MESSAGES_PER_PAGE = 20

export default class ContentView extends Component {
  constructor(props) {
    super(props)

    this.state = {
      loading: true,
      showModal: false,
      modifyId: null,
      selectedId: 'all',
      page: 1
    }
  }

  componentDidMount() {
    this.fetchCategoryMessages(this.state.selectedId)
      .then(::this.fetchCategories)
      .then(() => {
        return this.fetchSchema(this.state.selectedId)
      })
      .then(() => {
        this.setState({
          loading: false
        })
      })
  }

  fetchCategories() {
    return axios.get('/content/categories').then(({ data }) => {
      const count =
        this.state.selectedId === 'all'
          ? _.sumBy(data, 'count') || 0
          : _.find(data, { id: this.state.selectedId }).count

      this.setState({
        categories: data,
        count: count
      })
    })
  }

  fetchCategoryMessages(id) {
    const from = (this.state.page - 1) * MESSAGES_PER_PAGE
    const count = MESSAGES_PER_PAGE

    return axios
      .get('/content/categories/' + id + '/items', {
        params: { from: from, count: count, search: this.state.searchTerm }
      })
      .then(({ data }) => {
        this.setState({
          messages: data
        })
      })
  }

  fetchSchema(id) {
    return axios.get('/content/categories/' + id + '/schema').then(({ data }) => {
      this.setState({
        schema: data
      })
    })
  }

  createOrUpdateItem(data) {
    let url = '/content/categories/' + this.state.selectedId + '/items'

    if (this.state.modifyId) {
      const categoryId = _.find(this.state.messages, { id: this.state.modifyId }).categoryId
      url = '/content/categories/' + categoryId + '/items/' + this.state.modifyId
    }

    return axios.post(url, { formData: data }).then()
  }

  deleteItems(data) {
    return axios.post('/content/categories/all/bulk_delete', data).then()
  }

  handleToggleModal() {
    this.setState({
      showModal: !this.state.showModal,
      modifyId: null
    })
  }

  handleCreateOrUpdate(data) {
    this.createOrUpdateItem(data)
      .then(::this.fetchCategories)
      .then(() => {
        return this.fetchCategoryMessages(this.state.selectedId)
      })
      .then(() => {
        this.setState({ showModal: false })
      })
  }

  handleCategorySelected(id) {
    this.fetchCategoryMessages(id)
      .then(() => {
        this.setState({ selectedId: id })
      })
      .then(() => {
        this.fetchSchema(id)
      })
  }

  handleDeleteSelected(ids) {
    this.deleteItems(ids)
      .then(::this.fetchCategories)
      .then(() => {
        return this.fetchCategoryMessages(this.state.selectedId)
      })
  }

  handleModalShow(id, categoryId) {
    const showmodal = () =>
      setTimeout(() => {
        this.setState({
          modifyId: id,
          showModal: true
        })
      }, 250)

    if (!this.state.schema || this.state.selectedId !== categoryId) {
      this.fetchSchema(categoryId).then(() => {
        showmodal()
      })
    } else {
      showmodal()
    }
  }

  handleRefresh() {
    this.fetchCategoryMessages(this.state.selectedId || 'all')
  }

  handlePrevious() {
    this.setState({
      page: this.state.page - 1 || 1
    })

    setImmediate(() => {
      this.fetchCategoryMessages(this.state.selectedId)
    })
  }

  handleNext() {
    this.setState({
      page: this.state.page + 1
    })

    setImmediate(() => {
      this.fetchCategoryMessages(this.state.selectedId)
    })
  }

  handleUpload() {
    this.dropzone.open()
  }

  handleDownload() {
    var url = '/content/export'
    window.open(url, '_blank')
  }

  handleDropFiles(acceptedFiles) {
    const txt = `Upload will overwrite existing content if there is conflicting ID's. 
      Confirm the upload ${acceptedFiles.length} files?`

    if (acceptedFiles.length > 0 && confirm(txt) == true) {
      var formData = new FormData()
      acceptedFiles.forEach(file => {
        formData.append('files[]', file)
      })
      axios
        .post('/content/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(() => {
          this.fetchCategoryMessages(this.state.selectedId)
        })
    }
  }

  handleSearch(input) {
    this.setState({
      searchTerm: input
    })

    setImmediate(() => {
      this.fetchCategoryMessages(this.state.selectedId)
    })
  }

  render() {
    if (this.state.loading) {
      return null
    }

    const classNames = classnames({
      [style.content]: true,
      'bp-content': true
    })

    return (
      <ContentWrapper>
        <PageHeader>
          <span>Content Manager</span>
        </PageHeader>
        <table className={classNames}>
          <tbody>
            <tr>
              <td style={{ width: '20%' }}>
                <List
                  categories={this.state.categories || []}
                  selectedId={this.state.selectedId || 'all'}
                  handleAdd={::this.handleToggleModal}
                  handleCategorySelected={::this.handleCategorySelected}
                />
              </td>
              <td style={{ width: '80%' }}>
                <Dropzone
                  accept="application/json"
                  onDrop={this.handleDropFiles}
                  style={{}}
                  disableClick
                  ref={node => (this.dropzone = node)}
                >
                  <Manage
                    page={this.state.page}
                    count={this.state.count}
                    messagesPerPage={MESSAGES_PER_PAGE}
                    messages={this.state.messages || []}
                    searchTerm={this.state.searchTerm}
                    handlePrevious={::this.handlePrevious}
                    handleNext={::this.handleNext}
                    handleRefresh={::this.handleRefresh}
                    handleModalShow={::this.handleModalShow}
                    handleDeleteSelected={::this.handleDeleteSelected}
                    handleUpload={::this.handleUpload}
                    handleDownload={::this.handleDownload}
                    handleSearch={::this.handleSearch}
                  />
                </Dropzone>
              </td>
            </tr>
          </tbody>
        </table>
        <CreateModal
          show={this.state.showModal}
          schema={(this.state.schema && this.state.schema.json) || {}}
          uiSchema={(this.state.schema && this.state.schema.ui) || {}}
          formData={this.state.modifyId ? _.find(this.state.messages, { id: this.state.modifyId }).formData : null}
          handleCreateOrUpdate={::this.handleCreateOrUpdate}
          handleClose={::this.handleToggleModal}
        />
      </ContentWrapper>
    )
  }
}
