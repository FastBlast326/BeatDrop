import React, { Component } from 'react'
import PropTypes from 'prop-types'
import '../css/SongList.css'

import { connect } from 'react-redux'
import { refresh, loadMore } from '../actions/songListActions'
import { loadDetails } from '../actions/detailsActions'

import CompactSongListItem from './CompactSongListItem'
import LoadMore from './LoadMore';
import Button from './Button'

import addIcon from '../assets/add-filled.png'
import { defaultPlaylistIcon } from '../b64Assets'

import { setPlaylistPickerOpen, setNewPlaylistDialogOpen, clearPlaylistDialog, createNewPlaylist, addSongToPlaylist } from '../actions/playlistsActions'
import { downloadSong, deleteSong } from '../actions/queueActions'
import { displayWarning } from '../actions/warningActions'

import { ContextMenu, MenuItem, ContextMenuTrigger } from "react-contextmenu";

const { clipboard, shell } = window.require('electron')

class CompactSongList extends Component {

  constructor(props) {
    super(props)

    this.state = {
      song: ''
    }
  }

  componentDidMount() {
    document.getElementById('song-list').addEventListener('scroll', this.onScroll.bind(this))
    document.getElementById('song-list').scrollTop = this.props.scrollTop
  }
  
  componentWillUnmount() {
    document.getElementById('song-list').removeEventListener('scroll', this.onScroll)
  }

  onScroll() {
    let songList = document.getElementById('song-list')
    if(((songList.scrollHeight - songList.scrollTop) - songList.clientHeight) <= 1) {
      if(!this.props.loadingMore && !this.props.loading && this.props.autoLoadMore) {
        if(this.props.songs.songs.length >= this.props.songs.totalSongs) return
        this.props.loadMore()
      }
    }
  }

  componentWillReceiveProps(props) {
    console.log(props)
  }

  render() {
    return (
      <ul id='song-list'>
        {(this.props.loading) ?
          <CompactSongListItem loading />
        :
          this.props.songs.songs.map((song, i) => {
            return (
              <ContextMenuTrigger id={song.hash || song.hashMd5}>
                <CompactSongListItem key={i} title={song.songName} artist={song.authorName} uploader={song.uploader} difficulties={song.difficulties || song.difficultyLevels} imageSource={song.coverUrl} songKey={song.key} hash={song.hash || song.hashMd5} file={song.file} downloads={song.downloadCount} upvotes={song.upVotes} downvotes={song.downVotes} plays={song.playedCount} />
                <ContextMenu id={song.hash || song.hashMd5}>
                  <MenuItem onClick={(e) => {e.stopPropagation(); (!!song.file || this.props.songs.downloadedSongs.some(dsong => dsong.hash === (song.hash || song.hashMd5))) ? this.props.deleteSong(song.file || song.hash || song.hashMd5) : this.props.downloadSong(song.hash || song.hashMd5)}}>
                    {`${(!!song.file || this.props.songs.downloadedSongs.some(dsong => dsong.hash === (song.hash || song.hashMd5))) ? 'Delete'  : 'Download'} ${song.songName}`}
                  </MenuItem>
                  <MenuItem onClick={(e) => {e.stopPropagation(); this.setState({song}); this.props.setPlaylistPickerOpen(true)}}>
                    Add to Playlist
                  </MenuItem>
                  <MenuItem divider />
                  <MenuItem onClick={(e) => {e.stopPropagation(); clipboard.writeText(`beatdrop://songs/details/${song.hash || song.hashMd5}`); this.props.displayWarning({timeout: 5000, color:'lightgreen', text: `Sharable Link for ${song.songName} copied to clipboard!`})}}>
                    Share
                  </MenuItem>
                  {(!!song.key ? <MenuItem onClick={(e) => {e.stopPropagation(); shell.openExternal(`https://www.bsaber.com/songs/${song.key}#review`)}}>Review on BeastSaber</MenuItem> : null)}
                </ContextMenu>
              </ContextMenuTrigger>
            )
          })
        }
        <LoadMore />
        <div id="playlist-picker" className={this.props.playlistPickerOpen ? '' : 'hidden'}>
            <div id="playlist-picker-inner">
              <h1>Add to playlist:</h1><Button onClick={() => { this.props.setPlaylistPickerOpen(false) }}>Cancel</Button>
              <div id="playlist-picker-table">
                {this.props.playlists.map((playlist, i) => {
                  return <div className="playlist-picker-item" key={i} onClick={() => { this.props.addSongToPlaylist(this.state.song, playlist.file); this.props.setPlaylistPickerOpen(false) }}><img src={playlist.image} alt=""/><div><div className="playlist-picker-item-title">{playlist.playlistTitle}</div><div className="flex-br"></div><div className="playlist-picker-item-author">{playlist.playlistAuthor}</div><div className="flex-br"></div>{playlist.songs.length} Songs</div></div>
                })}
                <div className="playlist-picker-item" onClick={() => { this.props.setNewPlaylistDialogOpen(true); this.props.setPlaylistPickerOpen(false) }}><img src={addIcon} alt=""/><div><div className="playlist-picker-item-title">Create New</div></div></div>
              </div>
            </div>
          </div>
          <div id="new-playlist-dialog-under" className={this.props.newPlaylistDialogOpen ? '' : 'hidden'}>
            <div id="new-playlist-dialog">
              <div>
                <h2>New Playlist</h2>
                <label htmlFor="new-playlist-cover-image" id="new-playlist-add-cover-image"><img src={this.props.newCoverImageSource || defaultPlaylistIcon} alt="" /></label>
                <label htmlFor="new-playlist-cover-image" id="image-text">Cover Image (Click to Change)</label>
                <input type="file" name="new-playlist-cover-image" id="new-playlist-cover-image" accept=".jpg,.jpeg,.png,.gif" onChange={(e) => {this.props.loadPlaylistCoverImage(e.target.files[0].path || this.props.settings.newCoverImageSource)}} /><br />
              </div>
              <div id="new-playlist-info">
                <label htmlFor="new-playlist-title">Playlist Title</label>
                <input className="text-box" type='text' name="new-playlist-title" id="new-playlist-title" placeholder="Untitled Playlist" /><br /><br />
                <label htmlFor="new-playlist-author">Playlist Author</label>
                <input className="text-box" type="text" name="new-playlist-author" id="new-playlist-author" placeholder="Anonymous" /><br /><br />
                <label htmlFor="new-playlist-description">Playlist Description</label>
                <textarea className="text-area" name="new-playlist-description" id="new-playlist-description" cols="40" rows="7" placeholder="This playlist has no description." /><br /><br />
                <Button type="primary" onClick={() => { this.props.createNewPlaylist({playlistTitle: document.getElementById('new-playlist-title').value || 'Untitled Playlist', playlistAuthor: document.getElementById('new-playlist-author').value || 'Anonymous', playlistDescription: document.getElementById('new-playlist-description').value || 'This playlist has no description.'}); this.props.setNewPlaylistDialogOpen(false); this.props.setPlaylistPickerOpen(true); this.props.clearPlaylistDialog() }}>Create Playlist</Button>
                <Button onClick={() => { this.props.setNewPlaylistDialogOpen(false); this.props.setPlaylistPickerOpen(true); this.props.clearPlaylistDialog() }}>Cancel</Button>
              </div>
            </div>
          </div>
      </ul>
    )
  }
}

CompactSongList.propTypes = {
  loading: PropTypes.bool.isRequired,
  songs: PropTypes.object.isRequired,
  scrollTop: PropTypes.number.isRequired,
  refresh: PropTypes.func.refresh,
  autoLoadMore: PropTypes.bool.isRequired
}

const mapStateToProps = state => ({
  songs: state.songs,
  playlists: state.playlists.playlists,
  scrollTop: state.songs.scrollTop,
  loading: state.loading,
  loadingMore: state.loadingMore,
  autoLoadMore: state.settings.autoLoadMore,
  playlistPickerOpen: state.playlists.pickerOpen
})

export default connect(mapStateToProps, { refresh, loadMore, loadDetails, downloadSong, deleteSong, setPlaylistPickerOpen, setNewPlaylistDialogOpen, clearPlaylistDialog, createNewPlaylist, addSongToPlaylist, displayWarning })(CompactSongList)